use serde::{Deserialize, Serialize};

const CHAR_API: &str = "https://www.pathofexile.com/character-window/get-characters";

/// GGG Character data
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GggCharacter {
    pub name: String,
    pub class: String,
    pub level: u32,
    pub league: Option<String>,
    pub experience: Option<u64>,
    pub game: String,
}

/// Fetch a single realm's characters
async fn fetch_realm(client: &reqwest::Client, account_name: &str, realm: Option<&str>) -> Vec<GggCharacter> {
    let mut url = format!("{}?accountName={}", CHAR_API, urlencode(account_name));
    if let Some(r) = realm {
        url.push_str(&format!("&realm={}", r));
    }

    let game_tag = match realm {
        Some("poe2") => "poe2",
        _ => "poe1",
    };

    let res = match client
        .get(&url)
        .header("User-Agent", "exiled-orb/0.1.0")
        .send()
        .await
    {
        Ok(r) => r,
        Err(_) => return vec![],
    };

    if !res.status().is_success() {
        return vec![];
    }

    let data: serde_json::Value = match res.json().await {
        Ok(d) => d,
        Err(_) => return vec![],
    };

    data.as_array()
        .cloned()
        .unwrap_or_default()
        .iter()
        .filter_map(|c| {
            Some(GggCharacter {
                name: c["name"].as_str()?.to_string(),
                class: c["class"].as_str()?.to_string(),
                level: c["level"].as_u64()? as u32,
                league: c["league"].as_str().map(|s| s.to_string()),
                experience: c["experience"].as_u64(),
                game: game_tag.to_string(),
            })
        })
        .collect()
}

/// Fetch characters from both PoE1 and PoE2
#[tauri::command]
pub async fn fetch_characters(account_name: String) -> Result<Vec<GggCharacter>, String> {
    let client = reqwest::Client::new();

    // Fetch both realms in parallel
    let (poe1, poe2) = tokio::join!(
        fetch_realm(&client, &account_name, None),
        fetch_realm(&client, &account_name, Some("poe2")),
    );

    let mut all = poe1;
    all.extend(poe2);

    if all.is_empty() {
        return Err("No characters found. Check account name and make sure your profile is public.".to_string());
    }

    // Deduplicate by name — keep the higher level one
    let mut seen = std::collections::HashMap::new();
    for char in &all {
        let entry = seen.entry(char.name.clone()).or_insert(char.clone());
        if char.level > entry.level {
            *entry = char.clone();
        }
    }
    let mut all: Vec<GggCharacter> = seen.into_values().collect();

    // Sort by level descending
    all.sort_by(|a, b| b.level.cmp(&a.level));

    Ok(all)
}

/// A single socket with color and link group
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SocketInfo {
    pub color: String,
    pub group: u32,
}

/// A single equipped item
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GggItem {
    pub name: String,
    pub base_type: String,
    pub inventory_id: String,
    pub icon: String,
    pub rarity: String,
    pub socket_count: Option<u32>,
    pub max_links: Option<u32>,
    pub socket_details: Vec<SocketInfo>,
    pub ilvl: Option<u32>,
    pub corrupted: bool,
    pub mods: Vec<String>,
}

/// Fetch equipped items for a character
#[tauri::command]
pub async fn fetch_character_items(account_name: String, character: String) -> Result<Vec<GggItem>, String> {
    let client = reqwest::Client::new();
    let url = format!(
        "https://www.pathofexile.com/character-window/get-items?accountName={}&character={}",
        urlencode(&account_name),
        urlencode(&character),
    );

    let res = client
        .get(&url)
        .header("User-Agent", "exiled-orb/0.1.0")
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if !res.status().is_success() {
        return Err(format!("API error: {}", res.status()));
    }

    let data: serde_json::Value = res
        .json()
        .await
        .map_err(|e| format!("Parse error: {}", e))?;

    let items = data["items"]
        .as_array()
        .cloned()
        .unwrap_or_default()
        .iter()
        .filter_map(|item| {
            let inventory_id = item["inventoryId"].as_str()?.to_string();

            // Parse sockets with colors and link groups
            let mut socket_details: Vec<SocketInfo> = Vec::new();
            let (socket_count, max_links) = if let Some(sockets) = item["sockets"].as_array() {
                let count = sockets.len() as u32;
                let mut groups: std::collections::HashMap<u64, u32> = std::collections::HashMap::new();
                for s in sockets {
                    let group = s["group"].as_u64().unwrap_or(0) as u32;
                    *groups.entry(group as u64).or_insert(0) += 1;
                    let attr = s["attr"].as_str().unwrap_or("G");
                    let color = match attr {
                        "S" => "R",  // Strength = Red
                        "D" => "G",  // Dexterity = Green
                        "I" => "B",  // Intelligence = Blue
                        "G" => "W",  // General = White
                        "A" => "A",  // Abyss
                        "DV" => "W", // Delve = White
                        _ => "W",
                    };
                    socket_details.push(SocketInfo {
                        color: color.to_string(),
                        group,
                    });
                }
                let max = groups.values().max().copied().unwrap_or(0);
                (Some(count), Some(max))
            } else {
                (None, None)
            };

            // Rarity from frameType
            let rarity = match item["frameType"].as_u64().unwrap_or(0) {
                0 => "Normal",
                1 => "Magic",
                2 => "Rare",
                3 => "Unique",
                4 => "Gem",
                5 => "Currency",
                _ => "Normal",
            };

            // Collect explicit mods
            let mods: Vec<String> = item["explicitMods"]
                .as_array()
                .map(|arr| arr.iter().filter_map(|m| m.as_str().map(|s| s.to_string())).collect())
                .unwrap_or_default();

            Some(GggItem {
                name: item["name"].as_str().unwrap_or("").to_string(),
                base_type: item["typeLine"].as_str()?.to_string(),
                inventory_id,
                icon: item["icon"].as_str().unwrap_or("").to_string(),
                rarity: rarity.to_string(),
                socket_count,
                max_links,
                socket_details,
                ilvl: item["ilvl"].as_u64().map(|v| v as u32),
                corrupted: item["corrupted"].as_bool().unwrap_or(false),
                mods,
            })
        })
        .collect();

    Ok(items)
}

/// Proxy fetch for poe.ninja API (avoids CORS)
#[tauri::command]
pub async fn fetch_ninja(url: String) -> Result<String, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;
    let res = client
        .get(&url)
        .header("User-Agent", "exiled-orb/0.1.0")
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if !res.status().is_success() {
        return Err(format!("API error: {}", res.status()));
    }

    res.text().await.map_err(|e| format!("Read error: {}", e))
}

fn urlencode(s: &str) -> String {
    let mut result = String::with_capacity(s.len() * 2);
    for c in s.chars() {
        match c {
            'A'..='Z' | 'a'..='z' | '0'..='9' | '-' | '_' | '.' | '~' => result.push(c),
            ' ' => result.push_str("%20"),
            _ => {
                for b in c.to_string().as_bytes() {
                    result.push_str(&format!("%{:02X}", b));
                }
            }
        }
    }
    result
}
