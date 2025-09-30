import os
from langchain_community.vectorstores.azuresearch import AzureSearch
from langchain_openai import AzureOpenAIEmbeddings
from langchain.retrievers import EnsembleRetriever
import managers
import logging
from dotenv import load_dotenv

load_dotenv()

# Initialize the Keyvault manager
keyvault_manager = managers.KeyvaultManager()


# StorageKnowledgeManager class
class StorageKnowledgeManager:
    
    def __init__(self):        
        
        self._logger = logging.getLogger(__name__)
        
        self.azure_keyvault_client = keyvault_manager.get_azure_keyvault_client()        
        
        # Azure Open Ai credentials and embedding model; load some environment variables              
        self.azure_endpoint = self.azure_keyvault_client.get_secret("AZURE-OPENAI-ENDPOINT").value
        self.azure_openai_api_key = self.azure_keyvault_client.get_secret("AZURE-OPENAI-API-KEY").value
        self.azure_openai_api_version = os.environ["AZURE_OPENAI_VERSION"]
        self.azure_deployment = os.environ['AZURE_OPENAI_EMBEDDINGS_NAME']
        
        #Azure Ai Search credentials; load some environment variables
        self.vector_store_address = self.azure_keyvault_client.get_secret("AZURE-SEARCH-SERVICE-ENDPOINT").value
        self.vector_store_password = self.azure_keyvault_client.get_secret("AZURE-SEARCH-API-KEY").value
               
        #Azure Ai Search Indexes; load some environment variables
        index_name = os.environ["AZURE_SEARCH_INDEX_NAME"]
        #index_name_hardcoded = os.environ["AZURE_SEARCH_HARDCODED_INDEX_NAME"]                  
        
        #Azure Open Ai Embeddings instance
        self.embeddings: AzureOpenAIEmbeddings = AzureOpenAIEmbeddings(
            azure_deployment=self.azure_deployment,
            openai_api_version=self.azure_openai_api_version,
            azure_endpoint=self.azure_endpoint,
            api_key=self.azure_openai_api_key            
        )

        #Azure Ai Search index instances
        self.vector_store: AzureSearch = AzureSearch(azure_search_endpoint=self.vector_store_address,
                                                        azure_search_key=self.vector_store_password,
                                                        index_name=index_name,
                                                        embedding_function=self.embeddings.embed_query,
                                                        additional_search_client_options={"retry_total": 4}, 
                                                        semantic_configuration_name="semantic-config")
        # self.vector_store_hardcoded: AzureSearch = AzureSearch(azure_search_endpoint=self.vector_store_address,
        #                                                 azure_search_key=self.vector_store_password,
        #                                                 index_name=index_name_hardcoded,
        #                                                 embedding_function=self.embeddings.embed_query,
        #                                                 additional_search_client_options={"retry_total": 4}, 
        #                                                 semantic_configuration_name="semantic-config")
        
                     
                
    # Get the knowledge context retriever        
    def get_knowledgecontext_retriever(self, top_n):
        main_retriever = self.vector_store.as_retriever(search_type="semantic_hybrid", k= top_n)
        #hardcoded_retriever = self.vector_store_hardcoded.as_retriever(search_type="semantic_hybrid", k= 1)
        #ensemble_retriever = EnsembleRetriever(retrievers=[retriever1, retriever2])
        
        return main_retriever
        #return ensemble_retriever
        #return [main_retriever,hardcoded_retriever]
    
        
        
