import pandas as pd

df = pd.read_csv('node_info_biomarkers_final.csv')
df.to_json('output_node_info_biomarkers.json', orient='records')

df = pd.read_csv('node_info_gene_final.csv')
df.to_json('output_node_info_gene.json', orient='records')

df = pd.read_csv('node_info_LCMS_final.csv')
df.to_json('output_node_info_LCMS.json', orient='records')

df = pd.read_csv('node_info_SNP_final.csv')
df.to_json('output_node_info_SNP.json', orient='records')


df = pd.read_csv('centrality_df_simple.csv')
df.to_json('centrality.json')


csv_file_path = 'centrality_df_simple.csv'
df = pd.read_csv(csv_file_path)

# Assuming the columns are named 'Biomarker' and 'EigenvectorCentrality' respectively
# You can adjust the column names based on the actual names in your CSV
centrality_dict = df.set_index('Biomarker')['EigenvectorCentrality'].to_dict()

# Convert the dictionary to JSON format
json_result = pd.Series(centrality_dict).to_json()

# Print the JSON result
print(json_result)

# Save the JSON to a file if needed
with open('centrality.json', 'w') as json_file:
    json_file.write(json_result)