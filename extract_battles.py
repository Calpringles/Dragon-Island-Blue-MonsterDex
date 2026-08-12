import os
import plistlib
import json
import glob
from collections import defaultdict

app_dir = r'C:\Users\callu\Desktop\DIB\WorkingOn\temp_ipa\Payload\DragonIsland.app'
output_json = r'C:\Users\callu\Desktop\DIB\MonsterDex\battles.json'
loc_path = os.path.join(app_dir, 'en.lproj', 'Localizable.strings')

def load_plist(path):
    try:
        with open(path, 'rb') as f:
            return plistlib.load(f)
    except:
        return None

def main():
    strings_data = load_plist(loc_path) or {}
    battles = []
    npc_counts = defaultdict(int)

    def extract_monsters(monsters_list):
        parsed = []
        for m in monsters_list:
            if isinstance(m, dict) and 'type' in m:
                # Level scaling isn't exact level, it's a scalor, but sometimes we can just format it
                level = m.get('levelScalor', 1.0)
                if isinstance(level, (int, float)):
                    # Dragon Island Blue base levels are approx 5 * scalor maybe? We'll just display the scalor for now or relative level.
                    level_display = f"{level}x"
                else:
                    level_display = str(level)
                
                parsed.append({
                    'type': m['type'],
                    'level': level_display,
                    'boss': m.get('extraLivingArguments', {}).get('boss', False),
                    'displayName': m.get('extraLivingArguments', {}).get('displayName', '')
                })
        return parsed

    def process_encounter(enc):
        if not isinstance(enc, dict): return
        
        start_event = enc.get('startEvent', {})
        win_event = enc.get('winEvent', {})
        
        if not isinstance(start_event, dict): start_event = {}
        if not isinstance(win_event, dict): win_event = {}
        
        chat_key = start_event.get('chatKey')
        if not chat_key: return # Not an NPC battle
        
        npc_name = chat_key.replace('ChatKey', '')
        
        # Increment counter for this NPC
        npc_counts[npc_name] += 1
        counter = npc_counts[npc_name]
        
        # Get localized texts
        pre_text_key = f"{chat_key}ChatKey" if not chat_key.endswith('ChatKey') else chat_key
        post_text_key = win_event.get('chatKey', f"{npc_name}Defeated")
        if not post_text_key.endswith('ChatKey'):
            post_text_key += 'ChatKey'
            
        pre_text = strings_data.get(pre_text_key, "")
        post_text = strings_data.get(post_text_key, "")
        
        # Parse text (remove NPC name prefix if exists like "Cyrus:\n")
        if pre_text.startswith(f"{npc_name}:"): pre_text = pre_text.split(":", 1)[-1].strip()
        if post_text.startswith(f"{npc_name}:"): post_text = post_text.split(":", 1)[-1].strip()

        monsters = extract_monsters(enc.get('monsters', []))
        
        battles.append({
            'npc_id': npc_name,
            'encounter_number': counter,
            'quest': enc.get('questKey', ''),
            'pre_text': pre_text,
            'post_text': post_text,
            'monsters': monsters
        })

    def find_encounters(d):
        if isinstance(d, dict):
            if 'fixedEncounters' in d and isinstance(d['fixedEncounters'], list):
                for enc in d['fixedEncounters']:
                    process_encounter(enc)
            for k, v in d.items():
                find_encounters(v)
        elif isinstance(d, list):
            for item in d:
                find_encounters(item)

    # Search Worlds and Tournaments
    files = glob.glob(os.path.join(app_dir, '*.plist'))
    for f in files:
        name = os.path.basename(f)
        if name.startswith('World_') or name.startswith('Tournaments') or name.startswith('Dungeon_'):
            data = load_plist(f)
            if data:
                find_encounters(data)

    # Sort battles logically by NPC and counter
    battles.sort(key=lambda x: (x['npc_id'], x['encounter_number']))

    with open(output_json, 'w', encoding='utf-8') as f:
        json.dump(battles, f, ensure_ascii=False, indent=2)
    print(f'Extracted {len(battles)} battles to {output_json}')

if __name__ == '__main__':
    main()
