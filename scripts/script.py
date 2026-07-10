#!/usr/bin/env python3
import json
import sys

def process_items(items, category, type_rule='fixed'):

    result = []
    for item in items:
        new_item = {
            "category": category,
            "defense": {
                "base": item.get("def", 0)
            },
            "name": item.get("japanese", ""),
            "rarity": item.get("rarity", 1),
            "hrlimit": 0,
            "resistance": item.get("res", [0, 0, 0, 0]),
            "skills": {},
            "type": 0,
            "id": f"{item.get('index', 0):04d}"
        }

        if "skills" in item and isinstance(item["skills"], list):
            for skill in item["skills"]:
                if "j" in skill and "q" in skill:
                    new_item["skills"][skill["j"]] = skill["q"]

        if type_rule == 'class':
            cls = item.get("class")
            if cls is None:
                new_item["type"] = 0
            elif cls == "Blademaster":
                new_item["type"] = 1
            elif cls == "Gunner":
                new_item["type"] = 2
            else:
                new_item["type"] = cls

        result.append(new_item)

    return result


def main():
    if len(sys.argv) < 2:
        print("Usage: python script.py <input_json_file>")
        sys.exit(1)

    input_file = sys.argv[1]

    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    if "helm" in data:
        head_data = process_items(data["helm"], category=0, type_rule='fixed')
        with open("head.json", 'w', encoding='utf-8') as f:
            json.dump(head_data, f, ensure_ascii=False, indent=2)

    if "torso" in data:
        chest_data = process_items(data["torso"], category=1, type_rule='class')
        with open("chest.json", 'w', encoding='utf-8') as f:
            json.dump(chest_data, f, ensure_ascii=False, indent=2)

    if "arms" in data:
        arms_data = process_items(data["arms"], category=2, type_rule='class')
        with open("arms.json", 'w', encoding='utf-8') as f:
            json.dump(arms_data, f, ensure_ascii=False, indent=2)

    if "waist" in data:
        waist_data = process_items(data["waist"], category=3, type_rule='class')
        with open("waist.json", 'w', encoding='utf-8') as f:
            json.dump(waist_data, f, ensure_ascii=False, indent=2)

    if "legs" in data:
        legs_data = process_items(data["legs"], category=4, type_rule='class')
        with open("legs.json", 'w', encoding='utf-8') as f:
            json.dump(legs_data, f, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    main()