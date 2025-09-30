import os
import logging
import tiktoken
from langchain_openai import AzureChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.prompts import PromptTemplate
from langchain_core.runnables import RunnablePassthrough
import json
from datetime import datetime
import gptprompts.prompts
import managers
import models
import gptprompts
import requests
from requests.exceptions import HTTPError
import time
import uuid
from dotenv import load_dotenv

load_dotenv()

# Initialize the Keyvault manager
keyvault_manager = managers.KeyvaultManager()

# Initialize the CosmosDB history manager
history_manager = managers.CosmosHistoryManager(logger=None)

# Initialize the prompts variable
gpt_prompts = gptprompts.prompts


# GPT model manager class
class GptModelManager:
    
    def __init__(self, logger):
        self._logger = logger
        self._logger = logging.getLogger(__name__)
        self._language = ""
        self.response_prompt_tokens = 0
        self.response_completion_tokens = 0      
        self.model = None
        self.context_list = []
        self.start_time = None
        self.azure_keyvault_client = keyvault_manager.get_azure_keyvault_client()
        # Dashboard api key for feedback endpoint
        self.dashboard_api_key = self.azure_keyvault_client.get_secret("DASHBOARD-API-KEY").value               
      
    
    # Method to set the conversation context
    def add_element_to_context_list(self, context):
        self.context_list.append(str(context))
    
    # Method to clear the conversation context
    def clear_context_list(self):
        self.context_list.clear()        

    # Method to set the language model; load some environment variables
    def set_llm_model(self):        
        self.model = AzureChatOpenAI(                         
             api_version=os.environ["AZURE_OPENAI_VERSION"],
             azure_deployment=os.environ["AZURE_OPENAI_GPTMODEL_NAME"],
             azure_endpoint=self.azure_keyvault_client.get_secret("AZURE-OPENAI-ENDPOINT").value,
             api_key=self.azure_keyvault_client.get_secret("AZURE-OPENAI-API-KEY").value,
             temperature=0,             
             streaming=True                        
            )           
    
    # Method to set the language based on the frontend
    def set_language(self, language):
        if 'pt' in language:
            self._language = "portuguese from Portugal (pt-PT)"        
        elif 'en' in language:
            self._language = "english"
    
    def get_client_topic_others(self, language):
        if 'pt' in language:
            return 'Outros'
        elif 'en' in language:
            return 'Others'
            # Add other language options if that's the case
        else:
            return 'Others'

    # Method to Record the start time
    def set_start_time(self):
        self.start_time = time.time()            
    
    # Method to get the response prompt tokens    
    def get_response_prompt_tokens(self):
        return self.response_prompt_tokens
    
    # Method to set the response prompt tokens
    def set_response_prompt_tokens(self, tokens):
        self.response_prompt_tokens = int(self.response_prompt_tokens)+int(tokens)
    
    # Method to clear the response prompt tokens    
    def clear_response_prompt_tokens(self):
        self.response_prompt_tokens = 0

    # Method to get the completion response prompt tokens    
    def get_response_completion_tokens(self):
        return self.response_completion_tokens
    
    # Method to set the completion response prompt tokens
    def set_response_completion_tokens(self, tokens):
        self.response_completion_tokens = int(self.response_completion_tokens)+int(tokens)
    
    # Method to clear the completion response prompt tokens    
    def clear_response_completion_tokens(self):
        self.response_completion_tokens = 0
    
    # Method to get the prompt topic based on the user prompt
    def get_prompt_topic(self, user_prompt:str):

        # Get the check_topic prompt from the prompts file        
        system_prompt = gpt_prompts.check_topic

        # Create the custom prompt template
        prompt = ChatPromptTemplate.from_messages(
                [
                    ("system", system_prompt),
                    ("human", "{input}"),
                ]
        )

        # Create the chain
        chain = prompt | self.model

        try:

            # Get the user prompt topic from the GPT model
            llm_response = chain.invoke({"input": user_prompt})

            # Get and set the response prompt and completion tokens        
            tokens_system_prompt = self.get_token_usage(system_prompt)
            tokens_user_prompt = self.get_token_usage(user_prompt)
            tokens_completion = self.get_token_usage(llm_response.content)        
            self.set_response_prompt_tokens(int(tokens_system_prompt)+int(tokens_user_prompt))        
            self.set_response_completion_tokens(int(tokens_completion))

        except Exception as e:
            
            if "responsibleaipolicyviolation" in str(e).lower().strip():

                # Get and set the response prompt and completion tokens        
                tokens_system_prompt = self.get_token_usage(system_prompt)
                tokens_user_prompt = self.get_token_usage(user_prompt)
                tokens_completion = self.get_token_usage("Responsible AI Policy Violation")        
                self.set_response_prompt_tokens(int(tokens_system_prompt)+int(tokens_user_prompt))        
                self.set_response_completion_tokens(int(tokens_completion))
                
                return "Responsible AI Policy Violation"
         
        return llm_response.content
    
    # Method to get the client topic based on the user prompt
    def get_client_topic(self, user_prompt:str, client_topic_others:str):
                       
        # Get the client prompt from the prompts file        
        system_prompt = gpt_prompts.check_client_topic.format(client_topic_others = client_topic_others)

        # Create the custom prompt template
        prompt = ChatPromptTemplate.from_messages(
                [
                    ("system", system_prompt),
                    ("human", "{input}"),
                ]
        )

        # Create the chain
        chain = prompt | self.model

        # Get the user prompt topic from the GPT model
        llm_response = chain.invoke({"input": user_prompt})

        # Get and set the response prompt and completion tokens        
        tokens_system_prompt = self.get_token_usage(system_prompt)
        tokens_user_prompt = self.get_token_usage(user_prompt)
        tokens_completion = self.get_token_usage(llm_response.content)        
        self.set_response_prompt_tokens(int(tokens_system_prompt)+int(tokens_user_prompt))        
        self.set_response_completion_tokens(int(tokens_completion))
         
        return llm_response.content
            
    # Method to get the user prompt language
    def get_prompt_language(self, user_prompt:str):                
        
        # Get the check_language prompt from the prompts file        
        system_prompt = gpt_prompts.check_language

        # Create the custom prompt template
        prompt = ChatPromptTemplate.from_messages(
                [
                    ("system", system_prompt),
                    ("human", "{input}"),
                ]
        )

        # Create the chain
        chain = prompt | self.model

        # Get the user prompt language from the GPT model
        llm_response = chain.invoke({"input": user_prompt})

        # Get and set the response prompt and completion tokens        
        tokens_system_prompt = self.get_token_usage(system_prompt)
        tokens_user_prompt = self.get_token_usage(user_prompt)
        tokens_completion = self.get_token_usage(llm_response.content)        
        self.set_response_prompt_tokens(int(tokens_system_prompt)+int(tokens_user_prompt))        
        self.set_response_completion_tokens(int(tokens_completion))
        
        # Return the user prompt language
        if '1' in llm_response.content.strip():
            return 'pt'        
        elif '2' in llm_response.content.strip():
            return 'en'        
        else:
            return ''

    # Method to translate the user prompt if the frontend language is different from the user language
    def translate_prompt(self, user_prompt):
        
        # Get the translate_language prompt from the prompts file
        system_prompt = gpt_prompts.translate_language

        # Create the custom prompt template
        prompt = ChatPromptTemplate.from_messages(
                [
                    ("system", system_prompt),
                    ("human", "{input}"),
                ]
        )

        # Create the chain
        chain = prompt | self.model

        # Get the translated user prompt from the GPT model
        llm_response = chain.invoke({"input": user_prompt,"language": self._language})

        # Get and set the response prompt and completion tokens        
        tokens_system_prompt = self.get_token_usage(system_prompt.format(language=self._language))
        tokens_user_prompt = self.get_token_usage(user_prompt)
        tokens_completion = self.get_token_usage(llm_response.content)        
        self.set_response_prompt_tokens(int(tokens_system_prompt)+int(tokens_user_prompt))        
        self.set_response_completion_tokens(int(tokens_completion))               

        return llm_response.content 
        
    # Method to translate the user prompt if the frontend language is different from the user language
    def rewrite_user_prompt(self, user_prompt:str, conversation_history:str):
        
        if conversation_history:
            # Get the translate_language prompt from the prompts file            
            system_prompt = gpt_prompts.rewrite_user_prompt


            # Create the custom prompt template
            prompt = ChatPromptTemplate.from_messages(
                    [
                        ("system", system_prompt),
                        ("human", "{input}"),
                    ]
            )

            # Create the chain
            chain = prompt | self.model

            # Get the translated user prompt from the GPT model
            llm_response = chain.invoke({"input": user_prompt,"conversation_history": conversation_history, "language": self._language})

            # Get and set the response prompt and completion tokens        
            tokens_system_prompt = self.get_token_usage(system_prompt.format(conversation_history=conversation_history, language=self._language))            
            tokens_user_prompt = self.get_token_usage(user_prompt)
            tokens_completion = self.get_token_usage(llm_response.content)        
            self.set_response_prompt_tokens(int(tokens_system_prompt)+int(tokens_user_prompt))        
            self.set_response_completion_tokens(int(tokens_completion))

            user_prompt = llm_response.content            
        
        return user_prompt
    
    # Method to get the RAG chain for topics 1 and 2
    def get_ragChain_topics_1and2(self, user_prompt):

        # Get the current datetime in Portugal timezone
        now = datetime.now()
        # # Format the current timestamp
        timestamp_now_str = now.strftime("%Y-%m-%d %H-%M-%S")

        # Get the prompt_header from the prompts file
        system_prompt = gpt_prompts.prompt_header.format(language=self._language, present_date = timestamp_now_str)
                
        # Create the custom RAG prompt template
        prompt = ChatPromptTemplate.from_messages(
                [
                    ("system", system_prompt),
                    ("human", "{input}"),
                ]
        )

        # Create the RAG chain
        chain = {"input": RunnablePassthrough()} | prompt | self.model
          
        # Get and set the response prompt tokens        
        tokens_system_prompt = self.get_token_usage(system_prompt)
        tokens_user_prompt = self.get_token_usage(user_prompt)
        self.set_response_prompt_tokens(int(tokens_system_prompt)+int(tokens_user_prompt))
        
        return chain

    # Method to get the main RAG chain for topics
    def get_main_rag_chain(self, rewriten_user_prompt, conversation_history, retriever):                
        
        # Get the current datetime in Portugal timezone
        now = datetime.now()
        # # Format the current timestamp
        timestamp_now_str = now.strftime("%Y-%m-%d %H-%M-%S")

        # Get the prompt_header and main_chat_prompt
        prompt_header = gpt_prompts.prompt_header.format(language=self._language, present_date = timestamp_now_str)     
        main_chat_prompt = gpt_prompts.main_chat_prompt.format(language=self._language)
    
        # Create the custom RAG prompt template
        template = "{prompt_header}\n\n{system_prompt}\n\n{conversation_context}\n\n{context}\n\nQuestion: {question}"

        # Two options to build the context_string
        # 1 - From a common/ensembled retriever:
        context_string = (retriever | self.format_docs).invoke(rewriten_user_prompt)
        context_string = "# Context:\n\n"+context_string
        # 2 - From a list of retrievers: 
        # context_main = (retriever[0] | self.format_docs).invoke(rewriten_user_prompt)        
        # context_hardcoded = (retriever[1] | self.format_docs).invoke(rewriten_user_prompt)
        # context_string = "# Context:\n\n"+context_main+"\n\n"+context_hardcoded        

        # Create the custom RAG prompt based on the template        
        custom_rag_prompt = PromptTemplate.from_template(template)

        # Create the RAG chain 
        rag_chain = (
            {"prompt_header": lambda x: prompt_header,
             "system_prompt": lambda x: main_chat_prompt,
             "conversation_context": lambda x: conversation_history,
             "context": lambda x: context_string,
             "question": RunnablePassthrough()
            } | custom_rag_prompt | self.model
        )
        
        # Methods to get and set the response prompt tokens                
        response_prompt_tokens = self.get_token_usage(template.format(prompt_header=prompt_header,
                                                    system_prompt=main_chat_prompt,
                                                    conversation_context=conversation_history, context=context_string,
                                                    question=rewriten_user_prompt
                                                    ))
        self.set_response_prompt_tokens(int(response_prompt_tokens))

        # Print to check the header and main system prompt sent to gpt (Uncomment for testing purposes if necessary)
        # print(template.format(prompt_header=prompt_header,
        #                                             system_prompt=main_chat_prompt,
        #                                             conversation_context=conversation_history, context=context_string,
        #                                             question=rewriten_user_prompt
        #                                             ))
        
        return rag_chain
        
    # Method to format the documents retrieved by the retriever
    def format_docs(self, docs):
        # Many options to build the context
        context = "\n\n".join("Source: "+(str(doc.metadata['source']).strip()+"\nUrl: "+str(doc.metadata['url']).strip()+"\nPage: "+str(doc.metadata['page']).strip()+"\nContent:\n" +doc.page_content) for doc in docs)
        # context = "\n\n".join((str(doc.metadata['source']).strip()+":" +doc.page_content) for doc in docs)
        #context = "\n\n".join((str(doc.metadata['source']).strip()+"\n"+str(doc.metadata['page']).strip()+":" +doc.page_content) for doc in docs)                
        #context = "\n\n".join((str(doc.metadata).strip()+":" +doc.page_content) for doc in docs)
        #context = "\n\n".join((doc.page_content) for doc in docs)          
        return context
    
    # Method to generate the model response and stream it to the frontend
    def generate(self, chain, user_prompt:str, conversation_id, client_topic, audio_duration:float):

        # Initialize variables  
        full_response = ""        
        response_tokens = 0
        message_id = ""
        client_topic_id = None

        response_json = {             
             "content" : "",
             "message_id" : ""
        }

        if (chain is not None) and ('Responsible AI Policy Violation' not in client_topic):            
            try:
                # Stream the response to the frontend
                for chunk in chain.stream(user_prompt):                                    
                            if chunk.content:
                                    if chunk.id and not message_id:
                                        message_id = chunk.id
                                        response_json['message_id'] = message_id
                                        # Record the end time (when the answer starts to show on frontend)
                                        end_time = time.time()
                                    response_tokens += 1
                                    full_response += chunk.content
                                    response_json['content'] = chunk.content                                                        
                                    yield json.dumps(response_json)
            
            except Exception as e:
                if "responsibleaipolicyviolation" in str(e).lower().strip():
                    if 'portuguese from Portugal (pt-PT)' in self._language:
                        response_json = {             
                        "content" : "Lamentamos, mas não foi possível processar o seu pedido, pois este poderá conter conteúdo que contraria as nossas políticas de utilização responsável de inteligência artificial. Se desejar, pode reformular a sua pergunta e tentar novamente.\n\nO nosso sistema foi concebido para seguir diretrizes de utilização responsável de IA, garantindo uma comunicação segura e respeitosa. Diga-nos de que outra forma o podemos ajudar.",
                        "message_id" : str(uuid.uuid4())
                        }
                        full_response = "Lamentamos, mas não foi possível processar o seu pedido, pois este poderá conter conteúdo que contraria as nossas políticas de utilização responsável de inteligência artificial. Se desejar, pode reformular a sua pergunta e tentar novamente.\n\nO nosso sistema foi concebido para seguir diretrizes de utilização responsável de IA, garantindo uma comunicação segura e respeitosa. Diga-nos de que outra forma o podemos ajudar."
                        response_tokens = 110
                    else:
                        response_json = {             
                        "content" : "I'm sorry, but I couldn't process your request because it may contain content that goes against our Responsible AI use policies. If you’d like, feel free to rephrase your question and try again.\n\nOur system is designed to follow responsible AI guidelines to ensure safe and respectful communication. Let me know how I can assist you differently.",
                        "message_id" : str(uuid.uuid4())
                        }
                        full_response = "I'm sorry, but I couldn't process your request because it may contain content that goes against our Responsible AI use policies. If you’d like, feel free to rephrase your question and try again.\n\nOur system is designed to follow responsible AI guidelines to ensure safe and respectful communication. Let me know how I can assist you differently."
                        response_tokens = 75

                    end_time = time.time()
                    yield json.dumps(response_json)

        else:
            if 'portuguese from Portugal (pt-PT)' in self._language:
                response_json = {             
                "content" : "Lamentamos, mas não foi possível processar o seu pedido, pois este poderá conter conteúdo que contraria as nossas políticas de utilização responsável de inteligência artificial. Se desejar, pode reformular a sua pergunta e tentar novamente.\n\nO nosso sistema foi concebido para seguir diretrizes de utilização responsável de IA, garantindo uma comunicação segura e respeitosa. Diga-nos de que outra forma o podemos ajudar.",
                "message_id" : str(uuid.uuid4())
                }
                full_response = "Lamentamos, mas não foi possível processar o seu pedido, pois este poderá conter conteúdo que contraria as nossas políticas de utilização responsável de inteligência artificial. Se desejar, pode reformular a sua pergunta e tentar novamente.\n\nO nosso sistema foi concebido para seguir diretrizes de utilização responsável de IA, garantindo uma comunicação segura e respeitosa. Diga-nos de que outra forma o podemos ajudar."
                response_tokens = 110
            else:
                response_json = {             
                "content" : "I'm sorry, but I couldn't process your request because it may contain content that goes against our Responsible AI use policies. If you’d like, feel free to rephrase your question and try again.\n\nOur system is designed to follow responsible AI guidelines to ensure safe and respectful communication. Let me know how I can assist you differently.",
                "message_id" : str(uuid.uuid4())
                }
                full_response = "I'm sorry, but I couldn't process your request because it may contain content that goes against our Responsible AI use policies. If you’d like, feel free to rephrase your question and try again.\n\nOur system is designed to follow responsible AI guidelines to ensure safe and respectful communication. Let me know how I can assist you differently."
                response_tokens = 75

            end_time = time.time()
            yield json.dumps(response_json)
                            
        
        # Calculate the elapsed time between question and answer
        elapsed_time = end_time - self.start_time
        print(f"Elapsed time: {elapsed_time:.5f} seconds")

        # Get the full response prompt and completion tokens        
        prompt_tokens = self.get_response_prompt_tokens()
        response_tokens = int(self.get_response_completion_tokens()) + int(response_tokens)
        
        print("PromptTokens: "+str(prompt_tokens)+ "\nResponse Tokens: "+str(response_tokens))  
        
        # Save the new conversation in CosmosDB
        managers.await_cosmosdb_function(self.save_new_conversation(user_prompt, full_response, conversation_id, prompt_tokens, response_tokens, elapsed_time, message_id))                
       
        # If prod environment, the stats are sent to backoffice endpoints
        if 'true' in (os.environ['PROD_FLAG']).lower():
            
            # Headers
            headers = {
                "X-API-KEY": self.dashboard_api_key,
                "Content-Type": "application/json"
            }

            if client_topic:

                client_topic_dash = {
                    "projectId": self.azure_keyvault_client.get_secret("PROJECT-ID").value,
                    "contextName": client_topic
                }

                get_context_url = "https://genhelpbackoffice-api.azurewebsites.net/v1/gpt/contexts"

                # Get the client topic id from backoffice API (Uncomment for production stage)
                client_topic_id = self.post_data_get_context_id(get_context_url, client_topic_dash, headers)['contextId']

                self.context_list.append(client_topic_id)
            
            mensagem_dashboard = {
                "projectId": self.azure_keyvault_client.get_secret("PROJECT-ID").value,
                "conversationId": conversation_id,
                "messageId": message_id,
                "amount": 1,
                "prompt": user_prompt,
                "reply": full_response,
                "contexts": self.context_list,
                "context": client_topic_id,
                "audioDuration": audio_duration               
            }
            
            totaltokens_dashboard = {
                "projectId": self.azure_keyvault_client.get_secret("PROJECT-ID").value,
                "amount": int(response_tokens)+int(prompt_tokens)
            }        

            # Backoffice API URLs
            messages_url = "https://genhelpbackoffice-api.azurewebsites.net/v1/gpt/messages"
            tokens_url = "https://genhelpbackoffice-api.azurewebsites.net/v1/gpt/tokens"        

            # Make the POST requests for backoffice API (Uncomment for production stage)
            self.post_data(messages_url, mensagem_dashboard, headers)
            self.post_data(tokens_url, totaltokens_dashboard, headers)

        # Reset variables for the next interaction between user and gpt        
        self.clear_response_prompt_tokens()
        self.clear_response_completion_tokens()
        self.clear_context_list()   
            
    # Method to save the new conversation in CosmosDB
    async def save_new_conversation(self, user_prompt, full_message, conversation_id, prompt_tokens, response_tokens, elapsed_time, message_id):
        
        # Create a new conversation item with the date, user prompt, GPT model reply, and usage stats
        if full_message:                
                item = models.ConversationItem(
                    MessageId=message_id,
                    Date=str(datetime.now().isoformat()),
                    Query=user_prompt,
                    Reply=full_message,
                    Feedback="",
                    ElapsedTime=f"{elapsed_time:.5f} seconds",
                    Usage=models.UsageStats(                                                            
                        CompletionTokens = int(response_tokens),
                        PromptTokens = int(prompt_tokens),
                        TotalTokens = int(response_tokens)+int(prompt_tokens)
                    )                    
                )
        # Save the conversation in CosmosDB
        await history_manager.save_conversation(conversation_id, conversation_item=item.dict())

    # Method to make POST requests
    def post_data(self, url, data, headers):
        try:
            response = requests.post(url, headers=headers, data=json.dumps(data))
            response.raise_for_status()  # Raise exception for HTTP errors
            print(f"Successfully posted to {url}")
        except HTTPError as http_err:
            print(f"HTTP error occurred: {http_err}")
        except Exception as err:
            print(f"Other error occurred: {err}")

    # Method to make PATCH requests
    def patch_data(self, url, data, headers):
        try:
            response = requests.patch(url, headers=headers, data=json.dumps(data))
            response.raise_for_status()  # Raise exception for HTTP errors
            print(f"Successfully posted to {url}")
        except HTTPError as http_err:
            print(f"HTTP error occurred: {http_err}")
        except Exception as err:
            print(f"Other error occurred: {err}")


    # Method to make POST requests of context id
    def post_data_get_context_id(self, url, data, headers):
        try:
            response = requests.post(url, headers=headers, data=json.dumps(data))
            result = response.json()
            response.raise_for_status()  # Raise exception for HTTP errors
            print(f"Successfully posted to {url}")
            return result
        except HTTPError as http_err:
            print(f"HTTP error occurred: {http_err}")
        except Exception as err:
            print(f"Other error occurred: {err}")

    # Method to calculate the token usage of a text
    def get_token_usage(self, text):
        encoding = tiktoken.encoding_for_model("gpt-4o")
        tokens = len(encoding.encode(text))
        return tokens    
        
