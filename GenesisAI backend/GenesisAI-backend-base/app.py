from flask import Flask, request, jsonify, Response
from flask_cors import cross_origin
import managers
import logging
import os
import azure.cognitiveservices.speech as speechsdk
import time
from pydub import AudioSegment
from io import BytesIO
import scipy.io.wavfile as wav # type: ignore
from dotenv import load_dotenv

load_dotenv()

# Create the Flask app
app = Flask(__name__)

logger = logging.getLogger("AppController")


# Initialize the managers
keyvault_manager = managers.KeyvaultManager()
history_manager = managers.CosmosHistoryManager(logger=None)
knowledge_manager = managers.StorageKnowledgeManager()
model_manager = managers.GptModelManager(logger=None)

# Get Keyvault client
azure_keyvault_client = keyvault_manager.get_azure_keyvault_client()

# Load some environment variables
backend_api_key = azure_keyvault_client.get_secret("BACKEND-API-KEY").value
aisearch_top_n = os.environ['AISEARCH_TOP_N']
frontend_endpoint = os.environ["FRONTEND_ENDPOINT"]

# Dashboard api key for feedback endpoint
dashboard_api_key = azure_keyvault_client.get_secret("DASHBOARD-API-KEY").value


###############################
## Main backend chat endpoint##
###############################
@app.route('/genesisai-completions', methods=['POST', 'OPTIONS'])
@cross_origin(supports_credentials=True, origins=frontend_endpoint)
def stream():
    
    try:
        
        # Record the start time to process the citizen question
        model_manager.set_start_time()

        # Check if the request has the correct backend API key
        if request.headers.get("api-key") != backend_api_key:
            return jsonify({'error': 'Unauthorized'}), 500
        
        # Get the request JSON
        prompt_request = request.get_json()

        # Get the survey option if it exists, the user prompt, language, and conversation ID from the request
        #user_survey_profile = prompt_request['survey_option']
        user_prompt = prompt_request['prompt']
        language = prompt_request['language']        
        conversation_id = request.headers.get("context-key")
        audio_duration = 0
        try:
            audio_duration = prompt_request['audio_duration']
        except Exception as e:
            audio_duration = 0    

        # Set the langchain model client object
        model_manager.set_language(language)
        model_manager.set_llm_model()

        # Add element to context list (to be used only if user_survey_profile exists)
        #model_manager.add_element_to_context_list(user_survey_profile)

        # Get the prompt topic
        prompt_topic = model_manager.get_prompt_topic(user_prompt)    
        print(prompt_topic)

        if 'Responsible AI Policy Violation' in prompt_topic:
            rag_chain = None
            # Generate the model response and stream it to the frontend
            return Response(model_manager.generate(rag_chain, user_prompt, conversation_id, prompt_topic, audio_duration), mimetype='text/plain')


        # Get the prompt language
        promptLanguage = model_manager.get_prompt_language(user_prompt)

        # Translate the user prompt if the frontend language is different from the user language
        if promptLanguage != language and (not user_prompt.isdigit()) and (len(user_prompt) > 1):
            user_prompt = model_manager.translate_prompt(user_prompt)       
        
        client_topic_others = model_manager.get_client_topic_others(language)
        
        # If topics 1 or 2, get the langchain RAG chain for topics 1 and 2
        if prompt_topic in ('1', '2'):
            
            # Get the langchain RAG chain for topics 1 and 2
            rag_chain = model_manager.get_ragChain_topics_1and2(user_prompt)
            
            client_topic = client_topic_others    
    
        else:
            conversation_history = ''
            
            # Get conversation history
            conversation_history = managers.await_cosmosdb_function(history_manager.get_last_conversation_items(conversation_id))

            # Get the client topic
            client_topic = model_manager.get_client_topic(user_prompt, client_topic_others)
            print("Client topic: "+client_topic)

            # Get the knowledge context retriever
            retriever = knowledge_manager.get_knowledgecontext_retriever(aisearch_top_n)

            # Rewrite the user prompt based on the conversation context (if there's a conversation history)
            if client_topic_others.lower() in client_topic.lower():
                # Rewrite the user prompt based on the conversation context (if there's a conversation history)    
                rewriten_user_prompt = model_manager.rewrite_user_prompt(user_prompt, conversation_history)
                # Get the main langchain RAG chain
                rag_chain = model_manager.get_main_rag_chain(rewriten_user_prompt, conversation_history, retriever)
                print("Rewriten User question: "+rewriten_user_prompt)

            else:
                # Get the main langchain RAG chain
                rag_chain = model_manager.get_main_rag_chain(user_prompt, conversation_history, retriever)
                print("User question: "+user_prompt)

            
        # Generate the model response and stream it to the frontend
        return Response(model_manager.generate(rag_chain, user_prompt, conversation_id, client_topic, audio_duration), mimetype='text/plain')
        

    # Handle exceptions
    except Exception as e:
            return jsonify({'Error processing user question': str(e)}), 500


##############################
## Feedback backend endpoint##
##############################
@app.route('/genesisai-feedback', methods=['POST', 'OPTIONS'])
@cross_origin(supports_credentials=True, origins=frontend_endpoint)
def feedback():
   
    try:
       
        # Check if the request has the correct backend API key
        if request.headers.get("api-key") != backend_api_key:
            return jsonify({'error': 'Unauthorized'}), 500
       
        # Get the request JSON
        prompt_request = request.get_json()
 
        # Get the user prompt, language, GPT model, and conversation ID from the request
        message_id = prompt_request['message_id']
        feedback = prompt_request['feedback']
        conversation_id = request.headers.get("context-key")
 
        # Backoffice feedback URL
        feedback_url = "https://genhelpbackoffice-api.azurewebsites.net/v1/gpt/messages/feedback"
 
        if 'negative' in feedback.lower():
           
            thumbs_down_json = {
            "projectId": azure_keyvault_client.get_secret("PROJECT-ID").value,
            "conversationId": conversation_id,            
            "messageId": message_id,
            "feedback": -1
            }

            # Headers
            headers = {                
                "X-API-KEY": dashboard_api_key,
                "Content-Type": "application/json"
            }  

            if 'true' in (os.environ['PROD_FLAG']).lower():
                # Make the POST requests (Uncomment for production stage)
                model_manager.patch_data(feedback_url, thumbs_down_json, headers)

            conversation = managers.await_cosmosdb_function(history_manager.get_conversation(conversation_id))
            
            for item in conversation.Items:
                if item.MessageId == message_id:                    
                    item.Feedback = "Dislike"
                    break
                        
            managers.await_cosmosdb_function(history_manager.update_conversation(conversation_id, conversation))
       
        elif 'positive' in feedback.lower():
           
            thumbs_up_json = {
            "projectId": azure_keyvault_client.get_secret("PROJECT-ID").value,
            "conversationId": conversation_id,            
            "messageId": message_id,
            "feedback": 1
            }
           
            # Headers
            headers = {
                "X-API-KEY": dashboard_api_key,
                "Content-Type": "application/json"
            }  

            if 'true' in (os.environ['PROD_FLAG']).lower():
                # Make the POST requests (Uncomment for production stage)
                model_manager.patch_data(feedback_url, thumbs_up_json, headers)
            
            conversation = managers.await_cosmosdb_function(history_manager.get_conversation(conversation_id))
            
            for item in conversation.Items:
                if item.MessageId == message_id:                    
                    item.Feedback = "Like"
                    break
                        
            managers.await_cosmosdb_function(history_manager.update_conversation(conversation_id, conversation))
       
        else:
            no_feedback_json = {
            "projectId": azure_keyvault_client.get_secret("PROJECT-ID").value,
            "conversationId": conversation_id,            
            "messageId": message_id,
            "feedback": 0
            }
           
            # Headers
            headers = {
                "X-API-KEY": dashboard_api_key,
                "Content-Type": "application/json"
            }  

            if 'true' in (os.environ['PROD_FLAG']).lower():           
                # Make the POST requests (Uncomment for production stage)
                model_manager.patch_data(feedback_url, no_feedback_json, headers)
           
       
        return Response(status=200)
   
    # Handle exceptions
    except Exception as e:
            return jsonify({'Error processing feedback': str(e)}), 500
    

####################################
## Speech to text backend endpoint##
####################################
@app.route('/genesisai-speech', methods=['POST', 'OPTIONS'])
@cross_origin(supports_credentials=True, origins=frontend_endpoint)
def speech_to_text():
   
    try:
        
        # Check if the request has the correct backend API key
        if request.headers.get("api-key") != backend_api_key:
            return jsonify({'error': 'Unauthorized'}), 500
        
        if 'file' not in request.files:
            return jsonify({"status": "error", "message": "No audio file provided"}), 500
        
        if not request.headers.get("language"):
            return jsonify({"status": "error", "message": "No language header provided"}), 500

        # Get the request audio file
        file = request.files.get('file')

        # Get the request language
        language = request.headers.get("language")
                
        # Read the uploaded file
        audio = AudioSegment.from_file(file)
        # Convert to mono (1 channel), 32-bits per samples and 48KHz sample rate
        audio = audio.set_channels(1).set_frame_rate(48000).set_sample_width(4)
        # Save to a BytesIO object
        output = BytesIO()
        audio.export(output, format="wav")
        output.seek(0)
        # Read the WAV file using scipy
        sample_rate, audio_data = wav.read(output)

        audio_bytes = audio_data.tobytes()
        
        all_results = []

        channels = 1
        bits_per_sample = 32
        samples_per_second = 48000

        wave_format = speechsdk.audio.AudioStreamFormat(samples_per_second, bits_per_sample, channels)        
        audio_input_stream = speechsdk.audio.PushAudioInputStream(stream_format=wave_format)
        audio_config = speechsdk.audio.AudioConfig(stream=audio_input_stream)

        speech_config = speechsdk.SpeechConfig(subscription=azure_keyvault_client.get_secret("AISPEECH-KEY").value, region=azure_keyvault_client.get_secret("AISPEECH-REGION").value)
        speech_config.speech_recognition_language = language

        speech_recognizer = speechsdk.SpeechRecognizer(speech_config=speech_config, audio_config=audio_config)

        done = False

        def stop_cb(evt: speechsdk.SessionEventArgs):
            """callback that signals to stop continuous transcription upon receiving an event `evt`"""
            print('CLOSING {}'.format(evt))
            nonlocal done
            done = True
        
        # Subscribe to the events fired by the conversation transcriber
        speech_recognizer.recognizing.connect(lambda evt: print('RECOGNIZING: {}'.format(evt)))
        speech_recognizer.recognized.connect(lambda evt: all_results.append(evt.result.text))          
        speech_recognizer.session_started.connect(lambda evt: print('SESSION STARTED: {}'.format(evt)))
        speech_recognizer.session_stopped.connect(lambda evt: print('SESSION STOPPED {}'.format(evt)))
        speech_recognizer.canceled.connect(lambda evt: print('CANCELED {}'.format(evt)))
        # stop continuous transcription on either session stopped or canceled events
        speech_recognizer.session_stopped.connect(stop_cb)
        speech_recognizer.canceled.connect(stop_cb)

        # Start continuous speech recognition
        speech_recognizer.start_continuous_recognition()

        # Read the whole wave files at once and stream it to sdk
        #_, wav_data = wavfile.read(conversationfilename)
        audio_input_stream.write(audio_bytes)
        audio_input_stream.close()
        while not done:
            time.sleep(.5)
        
        speech_recognizer.stop_continuous_recognition()        
              
        final_transcription = ' '.join(all_results)

        # Get the audio duration in seconds
        audio_duration_seconds = audio.duration_seconds

        # Convert the audio duration to minutes
        audio_duration_minutes = audio_duration_seconds / 60
        
        audio_duration_minutes_rounded = float(round(audio_duration_minutes, 5))              

        return jsonify({"text": final_transcription, "audio_duration": audio_duration_minutes_rounded})

        
    # Handle exceptions
    except Exception as e:
            return jsonify({'Error processing speech to text': str(e)}), 500



####################################
## Text to speech backend endpoint##
####################################
@app.route('/genesisai-text-to-speech', methods=['POST', 'OPTIONS'])
@cross_origin(supports_credentials=True, origins=frontend_endpoint)
def text_to_speech():
   
    try:
        
        # Check if the request has the correct backend API key
        if request.headers.get("api-key") != backend_api_key:
            return jsonify({'error': 'Unauthorized'}), 401
        
        # Get the request JSON
        request_data = request.get_json()
        
        if not request_data or 'text' not in request_data:
            return jsonify({"status": "error", "message": "No text provided"}), 400
        
        if 'language' not in request_data:
            return jsonify({"status": "error", "message": "No language provided"}), 400

        # Get the text to convert and language
        text = request_data.get('text')
        language = request_data.get('language')
        
        # Optional: voice name (you can customize based on language)
        voice_name = request_data.get('voice_name', None)
        
        # Map language codes to Azure voice names if not provided
        voice_map = {
            'pt-PT': 'pt-PT-DuarteNeural',  # Portuguese (Portugal) - Male
            'pt-BR': 'pt-BR-AntonioNeural',  # Portuguese (Brazil) - Male
            'en-US': 'en-US-JennyNeural',    # English (US) - Female
            'en-GB': 'en-GB-RyanNeural',     # English (UK) - Male
            'es-ES': 'es-ES-AlvaroNeural',   # Spanish (Spain) - Male
            'fr-FR': 'fr-FR-DeniseNeural',   # French - Female
        }
        
        # Set voice name based on language if not provided
        if not voice_name:
            voice_name = voice_map.get(language, 'pt-PT-DuarteNeural')
        
        # Configure Azure Speech Service
        speech_config = speechsdk.SpeechConfig(
            subscription=azure_keyvault_client.get_secret("AISPEECH-KEY").value, 
            region="eastus"#azure_keyvault_client.get_secret("AISPEECH-REGION").value
        )
        
        # Set the voice name
        speech_config.speech_synthesis_voice_name = voice_name
        
        # Set output format to high quality audio
        speech_config.set_speech_synthesis_output_format(
            speechsdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3
        )
        
        # Create a speech synthesizer with null output (we'll get the audio data directly)
        synthesizer = speechsdk.SpeechSynthesizer(speech_config=speech_config, audio_config=None)
        
        # Perform text-to-speech
        result = synthesizer.speak_text_async(text).get()
        
        # Check result
        if result.reason == speechsdk.ResultReason.SynthesizingAudioCompleted:
            # Get audio data
            audio_data = result.audio_data
            
            # Return audio as response
            return Response(
                audio_data,
                mimetype='audio/mpeg',
                headers={
                    'Content-Type': 'audio/mpeg',
                    'Content-Disposition': 'inline; filename="speech.mp3"'
                }
            )
            
        elif result.reason == speechsdk.ResultReason.Canceled:
            cancellation_details = result.cancellation_details
            logger.error(f"Speech synthesis canceled: {cancellation_details.reason}")
            if cancellation_details.reason == speechsdk.CancellationReason.Error:
                logger.error(f"Error details: {cancellation_details.error_details}")
            return jsonify({
                "status": "error", 
                "message": f"Speech synthesis canceled: {cancellation_details.reason}"
            }), 500
        
        return jsonify({"status": "error", "message": "Unknown error in speech synthesis"}), 500

    # Handle exceptions
    except Exception as e:
        logger.error(f"Error in text-to-speech: {str(e)}")
        return jsonify({'Error processing text to speech': str(e)}), 500




if __name__ == "__main__":
    app.run(debug=True, port=5000)

    
