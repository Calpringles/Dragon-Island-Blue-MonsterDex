import os
import plistlib
import json
import glob

app_dir = r'C:\Users\callu\Desktop\DIB\WorkingOn\temp_ipa\Payload\DragonIsland.app'
output_json = r'C:\Users\callu\Desktop\DIB\MonsterDex\monsters.json'
loc_path = os.path.join(app_dir, 'en.lproj', 'Localizable.strings')

def load_plist(path):
    try:
        with open(path, 'rb') as f:
            return plistlib.load(f)
    except:
        return None

def find_all_monsters(d, results, strings_data):
    if isinstance(d, dict):
        for k, v in d.items():
            if isinstance(v, dict) and ('stars' in v or 'element' in v or 'index' in v) and k != 'rootStats':
                v['id'] = k
                loc_key = f'Renderable{k}NameKey'
                v['name'] = strings_data.get(loc_key, k)
                v['image'] = f'{k}-hd.png'
                v['locations'] = []
                v['moves'] = []
                results[k] = v
            elif isinstance(v, dict):
                find_all_monsters(v, results, strings_data)

def main():
    strings_data = load_plist(loc_path) or {}

    monsters_data = load_plist(os.path.join(app_dir, 'Monsters.plist'))
    monsters = {}
    
    find_all_monsters(monsters_data, monsters, strings_data)

    jobs_data = load_plist(os.path.join(app_dir, 'Jobs.plist'))
    flat_jobs = {}
    
    def flatten(d):
        for k, v in d.items():
            if isinstance(v, dict):
                if 'jobAbilities' in v or 'parent' in v:
                    flat_jobs[k] = v
                flatten(v)
    
    if jobs_data:
        flatten(jobs_data)

    for m_name, m_info in monsters.items():
        current_job = m_name
        visited = set()
        slots_filled = {}
        
        while current_job and current_job not in visited:
            visited.add(current_job)
            if current_job in flat_jobs:
                job_info = flat_jobs[current_job]
                if 'jobAbilities' in job_info:
                    for ability_key, ability_info in job_info['jobAbilities'].items():
                        if isinstance(ability_info, dict) and ability_key not in slots_filled:
                            instance_name = ability_info.get('arguments', {}).get('instanceName', ability_key)
                            slots_filled[ability_key] = {
                                'name': instance_name,
                                'type': ability_info.get('type', '')
                            }
                
                parent = job_info.get('parent')
                if parent:
                    current_job = parent.split('.')[-1]
                else:
                    current_job = None
            else:
                current_job = None
                
        m_info['moves'] = list(slots_filled.values())
        
    def add_location(m_type, chance, display_name, monsters):
        if display_name == 'The Abyss':
            display_name = 'The Abyss (not catchable)'
        
        if str(chance) == 'Boss':
            chance_display = 'Boss'
        else:
            chance_display = chance
            
        if m_type in monsters:
            monsters[m_type]['locations'].append({
                'zone': display_name,
                'chance': chance_display
            })

    def find_encounters(data, root_display_name, monsters, context=''):
        if isinstance(data, dict):
            if 'types' in data and isinstance(data['types'], list):
                for t in data['types']:
                    if isinstance(t, dict) and 'type' in t and 'chance' in t:
                        m_type = t['type']
                        chance = t['chance']
                        
                        display_name = root_display_name
                        if context and context != root_display_name:
                            loc_context_key = f'Renderable{context}NameKey'
                            context_name = strings_data.get(loc_context_key, context)
                            display_name = f'{display_name} ({context_name})'
                            
                        add_location(m_type, chance, display_name, monsters)
                        
            if 'fixedEncounters' in data and isinstance(data['fixedEncounters'], list):
                for enc in data['fixedEncounters']:
                    if isinstance(enc, dict) and 'monsters' in enc and isinstance(enc['monsters'], list):
                        for m in enc['monsters']:
                            if isinstance(m, dict) and 'type' in m:
                                add_location(m['type'], 'Boss', root_display_name, monsters)

            for k, v in data.items():
                find_encounters(v, root_display_name, monsters, k if k == 'instanceName' else context)
        elif isinstance(data, list):
            for item in data:
                find_encounters(item, root_display_name, monsters, context)

    files = glob.glob(os.path.join(app_dir, '*.plist'))
    for f in files:
        name = os.path.basename(f)
        if name.startswith('World_') or name.startswith('Dungeon_') or name.startswith('UnderWorld_') or name.startswith('Volcano'):
            data = load_plist(f)
            if data:
                base_name = name.replace('.plist', '')
                instance_name = data.get('instanceName', base_name)
                
                loc_key = f'Renderable{instance_name}NameKey'
                display_name = strings_data.get(loc_key)
                if not display_name:
                    loc_key_base = f'Renderable{base_name}NameKey'
                    display_name = strings_data.get(loc_key_base, instance_name)
                    
                find_encounters(data, display_name, monsters)

    with open(output_json, 'w', encoding='utf-8') as f:
        json.dump(monsters, f, ensure_ascii=False, indent=2)
    print(f'Successfully updated json at {output_json}')

if __name__ == '__main__':
    main()
