from azure.keyvault.secrets import SecretClient
from azure.identity import DefaultAzureCredential
import os
from dotenv import load_dotenv

load_dotenv()

# KeyvaultManager class
class KeyvaultManager:

    def __init__(self):

        #Set the keyvault parameters and client
        keyvault_credential = DefaultAzureCredential()
        keyvault_name = os.environ['KEYVAULT_NAME']
        KVUri = f"https://{keyvault_name}.vault.azure.net"
        self.azure_keyvault_client = SecretClient(vault_url=KVUri, credential=keyvault_credential)

    def get_azure_keyvault_client(self) -> SecretClient:
        return self.azure_keyvault_client