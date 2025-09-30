import {
  AfterViewInit,
  Component,
  ElementRef,
  ViewChild,
  QueryList,
  ViewChildren,
  ChangeDetectorRef,
  NgZone,
  OnDestroy,
  OnInit,
} from '@angular/core';
import {
  faMessage,
  faTrash,
  faUser,
  faEdit,
  faArrowRight,
  faArrowLeft,
  faCircleExclamation,
  faAngleDoubleUp,
  faAngleDoubleDown,
  faBars,
  faArrowsRotate,
} from '@fortawesome/free-solid-svg-icons';
import { RequestService } from './services/request/request.service';
import { ReCaptchaV3Service } from 'ng-recaptcha';
import { HttpClient } from '@angular/common/http';
import { faPenToSquare } from '@fortawesome/free-regular-svg-icons';

import katex from 'katex';

type Message = {
  type: 'question' | 'answer' | 'survey';
  text: string;
  feedback: 'nofbk' | 'positive' | 'negative';
  allowsfeedback: boolean;
  messageid: string;
};

type iFrameMessage = {
  type: 'signal_ready' | 'handshake' | 'update_allowance' | 'info_provided';
  id: string;
  np: number;
  ul: boolean;
};

type contextProfile = {
  id: string;
  namePT: string;
  nameEN: string;
};

interface StreamResponse {
  content: string;
  message_id: string;
}

@Component({
  selector: 'bot-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements AfterViewInit, OnInit, OnDestroy {
  @ViewChild('scrollMain', { static: false }) scrollMain: ElementRef;
  @ViewChildren('messageContainer') messageContainers!: QueryList<ElementRef>;

  // Turn on the voice recorder to send the question using voice
  turnOnVoiceRecorder = true;

  renderedIndexes: Set<number> = new Set();
  scrollContainer: any;
  drawerOpen = false;
  menuOpen = false;
  requestInProgress = false;
  requestError = false;
  showWarningPopup = true;
  requestErrorStatus: string;
  promptModel = '';
  standardQuestions = [''];
  messages: Message[] = [];
  isEnglish = false;
  currentLanguage: string = 'pt';
  currentModel: string = 'gpt4o';

  askDescription = 'Repetir pergunta';
  sendDescription = 'Enviar pergunta';
  micDescription = 'Perguntar por voz';
  newChatDescription = 'Nova conversa';

  // Assign the imported icon to a component property
  faBarsIcon = faBars;
  faMessageIcon = faMessage;
  faTrashIcon = faTrash;
  faUserIcon = faUser;
  faEditIcon = faEdit;
  faArrowRightIcon = faArrowRight;
  faArrowLeftIcon = faArrowLeft;
  faCircleExclamationIcon = faCircleExclamation;
  faAnglesDoubleUpIcon = faAngleDoubleUp;
  faAnglesDoubleDownIcon = faAngleDoubleDown;
  faArrowsRotateIcon = faArrowsRotate;
  faPenToSquare = faPenToSquare;

  streamInProgress: boolean = true;

  // Define the isDisabled property
  isDisabled = false;

  private messageEventListener: any;

  /*

  Variaveis para restrição de número de perguntas dentro do widget
  - Funcionalidade feita para Dr Finanças

  */

  // FLAG DE CONTROLO DE FUNCIONALIDADE

  private widgetRestrictFunction: boolean = false;

  //private parentURL: string = "https://storedevinterno.z28.web.core.windows.net";
  //private parentURL: string = "http://127.0.0.1:3000";
  //private parentURL: string = "file:///E:/Genesis/Genesis-work/code/helper-widget/drfinancas_widget_calls_parent/sample-page.html";
  private parentURL: string =
    'https://witty-bay-0e8f7ad03.4.azurestaticapps.net';

  private isLoggedin: boolean = false;
  private questionsAllowed: number = 4;
  private questionsMade: number = 0;
  private parentId: string = '';
  blockQuestions: boolean = false;
  private userName: string = '';
  private userEmail: string = '';
  private askedForName: boolean = false;
  private askedForEmail: boolean = false;

  /*
  Variaveis para survey
  - Funcionalidade feita para DGESTE
  */

  // FLAG DE CONTROLO DE FUNCIONALIDADE

  private surveyFunction: boolean = false;

  // Survey options
  surveyBlock: boolean = true;
  surveyOptions: contextProfile[] = [];
  selectedSurveyOption: string = '';

  // VARIAVEIS PARA DISCLAIMER

  // FLAG DE CONTROLO DE FUNCIONALIDADE
  disclaimerFunction: boolean = false;

  isTextExpanded = false;
  initialText =
    'Bem-vindo ao serviço de Chatbot da Educação, o EduBot.<br><br>' +
    'Por favor, note que este chatbot utiliza tecnologia de inteligência artificial (IA) para fornecer respostas automáticas às suas perguntas e auxiliar no encaminhamento de solicitações e informações sobre a Educação.<br><br>' +
    '<strong>Limitações da IA</strong>: Este sistema de IA não deve ser usado como única fonte para decisões importantes. As respostas fornecidas podem não abranger todas as nuances do seu caso específico, podendo, contudo, reformular a sua questão.<br><br>' +
    '<strong>Privacidade e Dados Pessoais</strong>: Não compartilhe informações pessoais sensíveis, confidenciais ou financeiros através deste chatbot. Se precisar discutir detalhes específicos que envolvem dados pessoais, por favor, entre em contato direto com os nossos Serviços.<br><br>' +
    '<strong>Atualizações e Correções</strong>: O sistema de chatbot é periodicamente atualizado para melhorar a precisão e a funcionalidade. No entanto, a DGEstE não garante que as respostas sejam sempre corretas ou completas.<br><br>' +
    '<strong>Não Substitui o Atendimento Humano</strong>: O chatbot é uma ferramenta de suporte e não substitui o atendimento prestado por Técnicos dos nossos Serviços.<br><br>' +
    '<strong>Consentimento para Uso de Dados</strong>: Ao utilizar o chatbot, concorda com o uso das suas mensagens para o aperfeiçoamento da ferramenta e melhor atendimento ao cidadão. Os dados são armazenados de forma segura durante 10 dias após o término da conversa, sendo que, não haverá circulação interna da mesma entre os nossos Serviços.';
  truncatedText: string = this.initialText.substring(0, 280) + '...'; // Adjust the character limit as needed

  toggleText(): void {
    this.isTextExpanded = !this.isTextExpanded;
  }

  constructor(
    private requestService: RequestService,
    private recaptchaV3Service: ReCaptchaV3Service,
    private cd: ChangeDetectorRef,
    private http: HttpClient,
    private ngZone: NgZone
  ) {
    //this.currentLanguage = document.documentElement.lang.toLowerCase();
    this.changeQuickQuestions();
  }

  //iframe testing
  ngOnInit() {
    localStorage.setItem('language', 'pt');
    //widget Restrict Function
    if (this.widgetRestrictFunction) {
      // Bind the event listener to preserve the context of 'this'
      this.messageEventListener = this.onMessage.bind(this);

      // Add an event listener for messages from the parent window
      window.addEventListener('message', this.messageEventListener, false);

      //Signal to parten iframe is loaded
      this.signalReadyToParent();
    }

    //SURVEY Function
    if (this.surveyFunction) {
      this.createSurvey();
      this.addSurvey();
    } else {
      this.addInitialMessage();
    }
  }

  ngOnDestroy() {
    if (this.widgetRestrictFunction) {
      // Remove the event listener when the component is destroyed
      window.removeEventListener('message', this.messageEventListener, false);
    }
  }

  /*
********************************************************
INIT OF Methods for widget communication with parent
********************************************************
*/
  signalReadyToParent() {
    const content: iFrameMessage = {
      type: 'signal_ready',
      id: '',
      np: 0,
      ul: false,
    };

    window.parent.postMessage(JSON.stringify(content), this.parentURL);
  }

  updateQuestionsMadeToParent() {
    const content: iFrameMessage = {
      type: 'update_allowance',
      id: '',
      np: this.questionsMade,
      ul: false,
    };

    window.parent.postMessage(JSON.stringify(content), this.parentURL);
  }

  info_providedToParent() {
    const content: iFrameMessage = {
      type: 'info_provided',
      id: '',
      np: 0,
      ul: true,
    };

    window.parent.postMessage(JSON.stringify(content), this.parentURL);
  }

  isIFrameMessage(obj: any): obj is iFrameMessage {
    return (
      obj &&
      typeof obj.type === 'string' &&
      typeof obj.id === 'string' &&
      typeof obj.np === 'number' &&
      typeof obj.ul === 'boolean' &&
      (obj.type === 'signal_ready' ||
        obj.type === 'handshake' ||
        obj.type === 'update_allowance' ||
        obj.type === 'info_provided')
    );
  }

  // Handler for incoming messages
  onMessage(event: MessageEvent) {
    // Security check: verify that the message comes from the expected origin
    if (event.origin !== this.parentURL) {
      console.warn('Received message from unauthorized origin:', event.origin);
      return;
    }

    try {
      const data = JSON.parse(event.data);

      if (this.isIFrameMessage(data)) {
        const response: iFrameMessage = data;

        if (response.type === 'handshake') {
          this.isLoggedin = response.ul;
          this.questionsMade = response.np;
          this.parentId = response.id;

          this.checkQuestionAvailability();
        } else {
          // Handle other types if necessary
          console.log('Received message of type:', response.type);
        }
      } else {
        console.error('Parsed data is not a valid:', data);
      }
    } catch (error) {
      console.error('Failed to parse message:', error);
    }
  }

  checkQuestionAvailability() {
    if (!this.isLoggedin) {
      if (this.questionsMade >= this.questionsAllowed) {
        this.blockQuestions = true;
        this.askForUserInformation();
      }
    }
  }

  askForUserInformation() {
    if (this.blockQuestions) {
      if (this.askedForName) {
        if (this.promptModel.length > 0) {
          this.userName = this.promptModel;
          this.askedForName = false;
          this.messages.push({
            type: 'question',
            text: this.promptModel,
            feedback: 'nofbk',
            allowsfeedback: false,
            messageid: '',
          });
          this.promptModel = '';
          this.scrollToBottom();
        }
      }

      if (this.askedForEmail) {
        if (this.promptModel.length > 0) {
          this.userEmail = this.promptModel;
          this.askedForEmail = false;
          this.blockQuestions = false;

          this.messages.push({
            type: 'question',
            text: this.promptModel,
            feedback: 'nofbk',
            allowsfeedback: false,
            messageid: '',
          });
          this.promptModel = '';

          this.messages.push({
            type: 'answer',
            text: `Obrigado! Vamos proceder à criação do seu registo! Podemos continuar a nossa conversa, como posso ajudar?`,
            feedback: 'nofbk',
            allowsfeedback: false,
            messageid: '',
          });

          this.isLoggedin = true;
          this.info_providedToParent();
          this.scrollToBottom();
        }
      }

      if (this.userName == '') {
        this.messages.push({
          type: 'answer',
          text: 'Atingiu o limite de respostas que o Bata pode dar neste momento. Se pretender continuar a fazer mais questões, poderá criar um registo. Pode-me indicar o seu nome para iniciar o registo?',
          feedback: 'nofbk',
          allowsfeedback: false,
          messageid: '',
        });
        this.askedForName = true;
        this.scrollToBottom();
      } else {
        if (this.userEmail == '') {
          const fullName = this.userName;
          const firstName = fullName.split(' ')[0];

          this.messages.push({
            type: 'answer',
            text: `Olá ${firstName}, só mais uma informação e podemos prosseguir. Pode-me indicar o seu endereço de email?`,
            feedback: 'nofbk',
            allowsfeedback: false,
            messageid: '',
          });
          this.askedForEmail = true;
          this.scrollToBottom();
        }
      }
    }
  }

  /*
********************************************************
END OF Methods for widget communication with parent
********************************************************
*/

  /*
********************************************************
INIT OF Methods for basic chat funcion
********************************************************
*/
  ngAfterViewInit() {
    this.scrollContainer = this.scrollMain.nativeElement;
  }

  submit(): void {
    if (this.widgetRestrictFunction && this.blockQuestions) {
      this.checkQuestionAvailability();
    } else {
      if (this.promptModel.length > 0 && !this.requestInProgress) {
        const prompt = this.promptModel;

        this.streamInProgress = true;
        this.promptModel = '';
        this.requestError = false;
        this.requestInProgress = true;

        this.messages.push({
          type: 'question',
          text: prompt,
          feedback: 'nofbk',
          allowsfeedback: false,
          messageid: '',
        });
        this.scrollToBottom();

        //SURVEY
        // add this.selectedSurveyOption as parameter

        this.requestService
          .fetchStream(prompt, this.currentLanguage, this.currentModel)
          .then((stream) => {
            stream.subscribe({
              next: (response) => {
                this.handleStreamResponse(response);
              },
              complete: () => {
                this.requestInProgress = false;
                this.streamInProgress = false;
                // Trigger rendering for the new message
                setTimeout(() => {
                  const latestIndex = this.messages.length - 1;
                  const latestContainer =
                    this.messageContainers.toArray()[latestIndex];
                  if (latestContainer) {
                    this.renderMessageWithKaTeX(
                      this.messages[latestIndex].text,
                      latestContainer.nativeElement
                    );
                  }
                });
                this.scrollToBottom();

                if (this.widgetRestrictFunction) {
                  this.questionsMade++;
                  this.updateQuestionsMadeToParent();
                  this.checkQuestionAvailability();
                }
                this.cd.detectChanges();
              },
              error: (error) => {
                console.error(error);
              },
            });
          });
      }
    }
  }

  handleStreamResponse(response: string): void {
    // Parse the response JSON
    let dataArray: StreamResponse[];
    try {
      // Trim any leading or trailing whitespace from the response
      let cleanResponse = response.trim();

      cleanResponse = cleanResponse.replaceAll('}{', '},{');

      // Check if the response ends with a comma and remove it if necessary
      if (cleanResponse.endsWith(',')) {
        cleanResponse = cleanResponse.slice(0, -1);
      }

      // Wrap the response in square brackets to parse it as an array
      dataArray = JSON.parse('[' + cleanResponse + ']');
    } catch (e) {
      console.error('Failed to parse response JSON:', e);
      return;
    }

    // Loop through each item in the data array
    for (let data of dataArray) {
      if (data.content.length > 0) {
        if (this.messages[this.messages.length - 1].type != 'answer') {
          this.messages.push({
            type: 'answer',
            text: '',
            feedback: 'nofbk',
            allowsfeedback: true,
            messageid: data.message_id,
          });
        }

        const currentText =
          this.messages[this.messages.length - 1].text + data.content;

        // Parse the current text
        this.messages[this.messages.length - 1].text =
          this.parseMarkdown(currentText);

        this.scrollToBottom();
      }
    }
  }

  parseMarkdown(text: string): string {
    // Parse code blocks
    text = text.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');

    // Parse inline code
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Parse bold text
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // Parse italic text
    text = text.replace(/_(.+?)_/g, '<em>$1</em>');
    text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // Parse strikethrough text
    text = text.replace(/~~(.+?)~~/g, '<del>$1</del>');

    // Parse blockquotes
    text = text.replace(/^>(.*)$/gm, '<blockquote>$1</blockquote>');

    // Parse headings (h1, h2, h3, h4)
    text = text.replace(/#### (.*?)\n/g, '<h4>$1</h4>');
    text = text.replace(/### (.*?)\n/g, '<h3>$1</h3>');
    text = text.replace(/## (.*?)\n/g, '<h2>$1</h2>');
    text = text.replace(/# (.*?)\n/g, '<h1>$1</h1>');

    // Parse links
    text = text.replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a target="_blank" href="$2">$1</a>'
    );

    // Parse images
    text = text.replace(
      /!\[([^\]]*)\]\(([^)]+)\)/g,
      '<img alt="$1" src="$2" />'
    );

    // Remove newlines from equation starts
    text = text.replace(/\\\[\n/g, '\\[');
    text = text.replace(/\n\\\]/g, '\\]');

    // Convert --- to br
    text = text.replace(/---\n/g, '<br>');

    // Convert single new lines to <br> tags
    text = text.replace(/\n/g, '<br>');

    // Parse tables
    /* text = text.replace(/^\|(.+)\|\n\|[-:|\s]+\|\n((\|.*\|\n)*)/gm, (match, headerRow, bodyRows) => {
    const headers = headerRow.trim().split('|').map((header: string) => `<th>${header.trim()}</th>`).join('');
    const rows = bodyRows.trim().split('\n').map((row: string) => {
        const cells = row.trim().split('|').map((cell: string) => `<td>${cell.trim()}</td>`).join('');
        return `<tr>${cells}</tr>`;
    }).join('');
    return `<table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>`;
  }); */

    return text;
  }

  renderMessageWithKaTeX(message: string, container: HTMLElement) {
    // Create a temporary container to parse the HTML message
    const tempContainer = document.createElement('div');
    tempContainer.innerHTML = message; // Set the raw HTML
    // Traverse and process nodes
    const traverseNodes = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        // If it's a text node, process equations within it
        const parts = node.nodeValue?.split(/(\\\(|\\\)|\\\[|\\\])/g) || [];
        const fragment = document.createDocumentFragment();

        parts.forEach((part, index) => {
          if (part.match(/\\\(|\\\[|\\\)|\\\]/)) {
            // Skip the LaTeX delimiters
            return;
          } else if (index > 0 && parts[index - 1].match(/\\\(|\\\[/)) {
            // Render equations
            const span = document.createElement('span');
            try {
              katex.render(part, span, { throwOnError: false });
            } catch (error) {
              span.textContent = part; // Fallback to plain text
            }
            fragment.appendChild(span);
          } else {
            // Render plain text
            fragment.appendChild(document.createTextNode(part));
          }
        });

        // Replace the original text node with the processed content
        if (node.parentNode) {
          node.parentNode.replaceChild(fragment, node);
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        // Recursively process child nodes
        Array.from(node.childNodes).forEach(traverseNodes);
      }
    };

    // Traverse the nodes of the temporary container
    Array.from(tempContainer.childNodes).forEach(traverseNodes);

    // Replace the container's content with the parsed content
    container.innerHTML = ''; // Clear the original content
    container.appendChild(tempContainer); // Append the processed content
  }

  handleResponseURLs() {
    let urlRegEx =
      /(http|ftp|https):\/\/([\w_-]+(?:(?:\.[\w_-]+)+))([\w.,@?^=%&:\/~+#-]*[\w@?^=%&\/~+#-]*(?! )[^\s\-\)])/g;
    this.messages[this.messages.length - 1].text = this.messages[
      this.messages.length - 1
    ].text.replace(urlRegEx, '<a target="_blank" href="$&">$&</a>');
  }

  clear(): void {
    if (!this.requestInProgress) {
      this.messages = [];
      this.requestError = false;
      this.requestInProgress = false;
      this.requestService.refreshContextKey();
      if (this.surveyFunction && this.surveyBlock) {
        this.addSurvey();
      } else {
        this.addInitialMessage();
      }
    }
  }

  //text: '<table class="answer-table"><thead><tr><th scope="col">#</th><th scope="col">First</th><th scope="col">Last</th><th scope="col">Handle</th></tr></thead><tbody><tr><th scope="row">1</th><td>Mark</td><td>Otto</td><td>@mdo</td></tr><tr><th scope="row">2</th><td>Jacob</td><td>Thornton</td><td>@fat</td></tr><tr><th scope="row">3</th><td>Larry</td><td>the Bird</td><td>@twitter</td></tr></tbody></table>',
  private addInitialMessage(): void {
    if (!this.isEnglish) {
      this.messages.push({
        type: 'answer',
        text: 'Olá! Eu sou o GenAI, o auxiliar AI criado pela Genesis. Neste momento, ainda estou em processo de aprendizagem e, por esse motivo, as informações que forneço poderão carecer de confirmação junto dos canais tradicionais. Em que posso ajudar?',
        feedback: 'nofbk',
        allowsfeedback: false,
        messageid: '',
      });
    } else {
      this.messages.push({
        type: 'answer',
        text: 'Hello, I am GenAI, the AI Assistant by Genesis. At the moment, I am still in the learning process and, for this reason, the information I provide may need to be confirmed through traditional channels. How can I help?',
        feedback: 'nofbk',
        allowsfeedback: false,
        messageid: '',
      });
    }
    /*   this.messages.push({
    type: 'question',
    text: 'Hello, I am GenAI, the AI Assistant by Genesis. At the moment, I am still in the learning process and, for this reason, the information I provide may need to be confirmed through traditional channels. How can I help?',
    feedback: 'nofbk',
    allowsfeedback: false,
  }); */
  }

  private changeQuickQuestions(): void {
    if (this.isEnglish) {
      this.standardQuestions = [
        'Question 1',
        'Question 2',
        'Question 3',
        'Question 4',
      ];
    } else {
      this.standardQuestions = [
        'Questão 1',
        'Questão 2',
        'Questão 3',
        'Questão 4',
      ];
    }
  }

  private changeAskDescription(): void {
    if (this.isEnglish) {
      this.askDescription = 'Ask again';
    } else {
      this.askDescription = 'Perguntar novamente';
    }
  }

  private changeSendDescription(): void {
    if (this.isEnglish) {
      this.sendDescription = 'Send question';
    } else {
      this.sendDescription = 'Enviar pergunta';
    }
  }

  private changeMicDescription(): void {
    if (this.isEnglish) {
      this.micDescription = 'Ask with voice';
    } else {
      this.micDescription = 'Perguntar por voz';
    }
  }

  private changeNewChatDescription(): void {
    if (this.isEnglish) {
      this.newChatDescription = 'New chat';
    } else {
      this.newChatDescription = 'Nova conversa';
    }
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      this.scrollContainer.scroll({
        top: this.scrollContainer.scrollHeight,
        left: 0,
        behavior: 'smooth',
      });
    }, 150);
  }

  onLangChange(): void {
    if (this.currentLanguage == 'pt') {
      this.isEnglish = false;
      localStorage.setItem('language', 'pt');
    } else {
      this.isEnglish = true;
      localStorage.setItem('language', 'en');
    }

    if (
      this.messages[this.messages.length - 1].type == 'answer' &&
      (this.messages[this.messages.length - 1].text.startsWith('Hello') ||
        this.messages[this.messages.length - 1].text.startsWith('Olá'))
    ) {
      this.messages.pop();
      this.addInitialMessage();
    } else {
      this.addInitialMessage();
    }

    this.changeQuickQuestions();
    this.changeAskDescription();
    this.changeSendDescription();
    this.changeMicDescription();
    this.changeNewChatDescription();
  }

  public toogleDrawer(): void {
    this.drawerOpen = !this.drawerOpen;
  }

  public handleFeedback(
    message: Message,
    feedback: 'positive' | 'negative'
  ): void {
    // If clicking again on the same feedback state, return to neutral
    if (message.feedback === feedback) {
      message.feedback = 'nofbk';
      this.requestService.sendFeedback('nofbk', message.messageid);
    } else {
      message.feedback = feedback;
      this.requestService.sendFeedback(feedback, message.messageid);
    }

    // Handle feedback api call
  }

  sendMessage(message: any) {
    this.promptModel = message;
    this.submit();
    this.cd.detectChanges();
    // this.scrollToBottom();
  }

  sendMessageByVoice(promptData: any) {
    this.promptModel = promptData.text;
    this.submit();
    this.cd.detectChanges();
    // this.scrollToBottom();
  }

  /*
********************************************************
END OF Methods for basic chat function
********************************************************
*/

  /*
********************************************************
INIT FOR Methods for Survey
********************************************************
*/
  private createSurvey(): void {
    this.surveyOptions.push({
      id: '23dd6b44-be8d-4988-b99a-c51f3bcf44d0',
      namePT: 'Aluno',
      nameEN: 'Student',
    });

    this.surveyOptions.push({
      id: '5e513ff0-4bdf-4733-9649-ae548de826da',
      namePT: 'Encarregado de educação',
      nameEN: 'Educational Guardian',
    });

    this.surveyOptions.push({
      id: '57771d15-9c6e-4b9a-8e36-b375d796e784',
      namePT: 'Município',
      nameEN: 'Municipality',
    });

    this.surveyOptions.push({
      id: '626ebb0e-6c1b-494c-a14e-01b42d250c57',
      namePT: 'Escola',
      nameEN: 'School',
    });
  }

  private addSurvey(): void {
    if (!this.isEnglish) {
      this.messages.push({
        type: 'survey',
        text: 'Olá, eu sou o GenAI, o assistente virtual. Para começar primeiro selecione a opção mais adequada. Obrigado!',
        feedback: 'nofbk',
        allowsfeedback: false,
        messageid: '',
      });
    } else {
      this.messages.push({
        type: 'survey',
        text: "Hello, I'm GenAI, the virtual assistant. To get started, please select the most suitable option. Thank you!",
        feedback: 'nofbk',
        allowsfeedback: false,
        messageid: '',
      });
    }
  }

  public answerSurvey(id: string) {
    this.selectedSurveyOption = id;
    this.surveyBlock = false;
    this.messages.pop();
    this.addInitialMessage();
  }

  /*
********************************************************
END OF Method for Survey
********************************************************
*/
}
