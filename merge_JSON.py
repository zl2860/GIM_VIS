import json

# Replace these with the paths to your actual JSON files
json_files = ['output_node_info_biomarkers.json', 'output_node_info_gene.json', 
              'output_node_info_LCMS.json', 'output_node_info_SNP.json']
merged_data = {}

for file_path in json_files:
    with open(file_path, 'r') as file:
        data = json.load(file)
        for item in data:
            node_name = item["Node name"]
            if node_name not in merged_data:
                merged_data[node_name] = item
            else:
                # Update existing entry with any new keys/values
                merged_data[node_name].update(item)

# Write the merged data to a new file
with open('merged_node_details.json', 'w') as merged_file:
    json.dump(merged_data, merged_file)