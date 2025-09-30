import json

def convert_to_env(json_file_path, env_file_path):
    # Open and load the appsettings.json file
    with open(json_file_path, 'r') as json_file:
        app_settings = json.load(json_file)

    # Open the .env file to write
    with open(env_file_path, 'w') as env_file:
        for setting in app_settings:
            name = setting["name"]
            value = setting["value"]
            # Write each setting in NAME=VALUE format
            env_file.write(f"{name}={value}\n")

# Example usage:
# Specify the path to your appsettings.json and output .env file
json_file_path = "appsettings.json"  # Adjust the path if needed
env_file_path = ".env"

# Call the function to convert the file
convert_to_env(json_file_path, env_file_path)

print(f".env file generated at: {env_file_path}")
