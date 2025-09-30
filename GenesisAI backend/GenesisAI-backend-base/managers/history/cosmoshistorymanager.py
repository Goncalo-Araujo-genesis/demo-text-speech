from azure.cosmos import CosmosClient
from azure.cosmos.exceptions import CosmosHttpResponseError
from typing import List, Optional
import models
import managers
import os
import asyncio
from dotenv import load_dotenv

load_dotenv()

# Initialize the Keyvault manager
keyvault_manager = managers.KeyvaultManager()

# CosmosHistoryManager class
class CosmosHistoryManager:
    
    def __init__(self, logger):
        self._logger = logger
        
        self.azure_keyvault_client = keyvault_manager.get_azure_keyvault_client()        

        # Load the CosmosDB environment variables
        url = self.azure_keyvault_client.get_secret("COSMOSDB-ENDPOINT").value
        credential = self.azure_keyvault_client.get_secret("COSMOSDB-PRIMARY-KEY").value
        self._cosmos = CosmosClient(url, credential)
        self._database = self._cosmos.get_database_client(os.environ["COSMOSDB_DATABASE"],)
        self._container = self._database.get_container_client(os.environ["COSMOSDB_CONTAINER"],)
        
    # Get a conversation from CosmosDB
    # Each conversation in CosmosDB has a unique id and a partition key. 
    # Both are the same and should be equal to the conversation_id, which is the frontend session id.
    async def get_conversation(self, conversation_id: str) -> Optional[models.Conversation]:
        try:            
            conversation_response = self._container.read_item(item=conversation_id, partition_key=conversation_id)
            items = conversation_response.get('Items', {})

            if isinstance(items, dict):
                conversation_items = [models.ConversationItem(**items)]
            elif isinstance(items, list):
                conversation_items = [models.ConversationItem(**item) for item in items]
            else:
                conversation_items = []

            conversation_instance = models.Conversation(
                id=conversation_response['id'],
                partitionKey=conversation_response['partitionKey'],
                Items=conversation_items,
                TotalTokens=conversation_response.get('TotalTokens', 0)
            )

            return conversation_instance
        except CosmosHttpResponseError as ex:
            if ex.status_code == 404:
                return None
            else:
                print(f"Erro ao obter a conversa: {str(ex)}")
                return None
        except Exception as e:
            print(f"Erro ao processar a conversa: {str(e)}")
            return None

    
    # Save a conversation to CosmosDB
    async def save_conversation(self, conversation_id: str, conversation_item: dict):
        try:
            convo_response = self._container.read_item(item=conversation_id, partition_key=conversation_id)
            
            items = convo_response.get('Items', {})
            if isinstance(items, dict):
                items = [items] 
            elif not isinstance(items, list):
                raise ValueError("Items field is not a list or a dictionary")

            conversation_items = [models.ConversationItem(**item) for item in items]
            conversation_item_instance = models.ConversationItem(**conversation_item)
            conversation_items.append(conversation_item_instance)

            convo = models.Conversation(
                id=convo_response['id'],
                partitionKey=convo_response['partitionKey'],
                Items=conversation_items,
                TotalTokens=sum(item.Usage.TotalTokens for item in conversation_items)
            )
            self._container.replace_item(item=conversation_id, body=convo.dict())
        
        except CosmosHttpResponseError as e:
            if e.status_code == 404:
                convo = models.Conversation(
                    id=conversation_id,
                    partitionKey=conversation_id,
                    Items=[models.ConversationItem(**conversation_item)],
                    TotalTokens=conversation_item['Usage']['TotalTokens']
                )
                self._container.create_item(body=convo.dict())
        except Exception as e:
            print(f"Erro ao salvar a conversa: {str(e)}")


    # Update a conversation to CosmosDB (for likes and dislikes)
    async def update_conversation(self, conversation_id: str, conversation: models.Conversation):
        try:
            
            self._container.replace_item(item=conversation_id, body=conversation.dict())
        
        except CosmosHttpResponseError as e:
            if e.status_code == 404:                
                self._container.create_item(body=conversation.dict())
        except Exception as e:
            print(f"Erro ao salvar a conversa: {str(e)}")


    # Method to get the conversation history from CosmosDB        
    async def get_last_conversation_items(self, conversation_id):
        items = []        
        if conversation_id:
                convo = await self.get_conversation(conversation_id)
                max_items = 2 # Number of previous query/Reply pairs to get
                if convo:
                    recent_items = convo.Items[-max_items:]  # This will give the last max_items items
                    if len(recent_items) > 0:
                        items.append("\n# Conversation History:\n")
                        for entry in recent_items:
                            items.append(f"- User:\n{entry.Query}\n")
                            items.append(f"- You:\n{entry.Reply}\n")
                        items.append("\n# End of conversation history.")

        return ("\n".join(items)).strip()

# Method to run CosmosDB async functions 
def await_cosmosdb_function(function):
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        function_result = loop.run_until_complete(function)
        loop.close()
        return function_result
    except Exception as err:
        print(f"An error occurred: {err}")