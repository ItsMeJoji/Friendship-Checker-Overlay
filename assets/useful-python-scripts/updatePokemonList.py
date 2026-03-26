import os
import json

directory_path = os.path.join(os.path.dirname(__file__), '../images/Pokemon')
output_file_path = os.path.join(os.path.dirname(__file__), 'arrays.js')

pokemon_names = [
    os.path.splitext(file)[0]
    for file in os.listdir(directory_path)
    if file.endswith('.png')
]

content = f"""const availablePokemon = {json.dumps(pokemon_names, indent=4)};

// Export the array if using a module system
if (typeof module !== 'undefined' && module.exports) {{
    module.exports = availablePokemon;
}}
"""

with open(output_file_path, 'w') as f:
    f.write(content)

print('Pokemon list updated successfully.')