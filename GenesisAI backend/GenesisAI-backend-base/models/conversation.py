from pydantic import BaseModel

# Define the models for the conversation
# Conversation objects are saved in CosmosDB as JSON documents

# Define the UsageStats model
class UsageStats(BaseModel):
    CompletionTokens: int
    PromptTokens: int
    TotalTokens: int

# Define the ConversationItem model
class ConversationItem(BaseModel):
    MessageId: str
    Date: str    
    Query: str
    Reply: str
    Feedback: str
    ElapsedTime: str
    Usage: UsageStats

# Define the Conversation model  
class Conversation(BaseModel):
    id: str
    partitionKey: str
    Items: list[ConversationItem]
    TotalTokens: int
