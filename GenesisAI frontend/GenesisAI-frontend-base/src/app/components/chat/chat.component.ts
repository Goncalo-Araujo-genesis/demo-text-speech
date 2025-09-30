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
  faEllipsisVertical,
  faSignOutAlt,
  faGlobe,
} from '@fortawesome/free-solid-svg-icons';
import { faPenToSquare } from '@fortawesome/free-regular-svg-icons';
import { RequestService } from '../../services/request/request.service';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { ReCaptchaV3Service } from 'ng-recaptcha';
import { HttpClient } from '@angular/common/http';
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
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss'],
})
export class ChatComponent implements AfterViewInit, OnInit, OnDestroy {
  @ViewChild('scrollMain', { static: false }) scrollMain!: ElementRef;
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
  requestErrorStatus: string = '';
  promptModel = '';
  standardQuestions = [''];
  messages: Message[] = [];
  isEnglish = false;
  currentLanguage: string = 'pt';
  currentModel: string = 'gpt4o';
  showLogoutMenu = false;

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
  faEllipsisVertical = faEllipsisVertical;
  faSignOutAlt = faSignOutAlt;
  faGlobe = faGlobe;
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
  truncatedText: string = this.initialText.substring(0, 280) + '...';

  toggleText(): void {
    this.isTextExpanded = !this.isTextExpanded;
  }

  constructor(
    private requestService: RequestService,
    private recaptchaV3Service: ReCaptchaV3Service,
    private cd: ChangeDetectorRef,
    private http: HttpClient,
    private ngZone: NgZone,
    private authService: AuthService,
    private router: Router
  ) {
    this.changeQuickQuestions();
  }

  ngOnInit() {
    localStorage.setItem('language', 'pt');
    
    // Subscribe to logout allowed state
    this.authService.logoutAllowed$.subscribe(allowed => {
      this.showLogoutMenu = allowed;
    });
    
    // Widget Restrict Function
    if (this.widgetRestrictFunction) {
      this.messageEventListener = this.onMessage.bind(this);
      window.addEventListener('message', this.messageEventListener, false);
      this.signalReadyToParent();
    }

    // SURVEY Function
    if (this.surveyFunction) {
      this.createSurvey();
      this.addSurvey();
    } else {
      this.addInitialMessage();
    }
  }

  ngOnDestroy() {
    if (this.widgetRestrictFunction && this.messageEventListener) {
      window.removeEventListener('message', this.messageEventListener, false);
    }
  }

  ngAfterViewInit() {
    this.scrollContainer = this.scrollMain.nativeElement;
  }

  // Widget communication methods
  private onMessage(event: MessageEvent) {
    if (event.origin !== this.parentURL) {
      return;
    }

    const message: iFrameMessage = event.data;
    
    switch (message.type) {
      case 'handshake':
        this.parentId = message.id;
        this.questionsAllowed = message.np;
        this.questionsMade = 0;
        break;
      case 'update_allowance':
        this.questionsAllowed = message.np;
        break;
    }
  }

  private signalReadyToParent() {
    if (window.parent && window.parent !== window) {
      const message: iFrameMessage = {
        type: 'signal_ready',
        id: 'genesis-widget',
        np: 0,
        ul: false
      };
      window.parent.postMessage(message, this.parentURL);
    }
  }

  private updateQuestionsMadeToParent() {
    if (window.parent && window.parent !== window && this.parentId) {
      const message: iFrameMessage = {
        type: 'update_allowance',
        id: this.parentId,
        np: this.questionsMade,
        ul: this.isLoggedin
      };
      window.parent.postMessage(message, this.parentURL);
    }
  }

  private info_providedToParent() {
    if (window.parent && window.parent !== window && this.parentId) {
      const message: iFrameMessage = {
        type: 'info_provided',
        id: this.parentId,
        np: this.questionsMade,
        ul: this.isLoggedin
      };
      window.parent.postMessage(message, this.parentURL);
    }
  }

  private checkQuestionAvailability() {
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
    let dataArray: StreamResponse[];
    try {
      let cleanResponse = response.trim();
      cleanResponse = cleanResponse.replaceAll('}{', '},{');
      
      if (cleanResponse.endsWith(',')) {
        cleanResponse = cleanResponse.slice(0, -1);
      }
      
      dataArray = JSON.parse('[' + cleanResponse + ']');
    } catch (e) {
      console.error('Failed to parse response JSON:', e);
      return;
    }

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

        this.messages[this.messages.length - 1].text =
          this.parseMarkdown(currentText);

        this.scrollToBottom();
      }
    }
  }

  parseMarkdown(text: string): string {
    text = text.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/_(.+?)_/g, '<em>$1</em>');
    text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
    text = text.replace(/~~(.+?)~~/g, '<del>$1</del>');
    text = text.replace(/^>(.*)$/gm, '<blockquote>$1</blockquote>');
    text = text.replace(/#### (.*?)\n/g, '<h4>$1</h4>');
    text = text.replace(/### (.*?)\n/g, '<h3>$1</h3>');
    text = text.replace(/## (.*?)\n/g, '<h2>$1</h2>');
    text = text.replace(/# (.*?)\n/g, '<h1>$1</h1>');
    text = text.replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a target="_blank" href="$2">$1</a>'
    );
    text = text.replace(
      /!\[([^\]]*)\]\(([^)]+)\)/g,
      '<img alt="$1" src="$2" />'
    );
    text = text.replace(/\\\[\n/g, '\\[');
    text = text.replace(/\n\\\]/g, '\\]');
    text = text.replace(/---\n/g, '<br>');
    text = text.replace(/\n/g, '<br>');

    return text;
  }

  renderMessageWithKaTeX(message: string, container: HTMLElement) {
    const tempContainer = document.createElement('div');
    tempContainer.innerHTML = message;
    
    const traverseNodes = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const parts = node.nodeValue?.split(/(\\\(|\\\)|\\\[|\\\])/g) || [];
        const fragment = document.createDocumentFragment();

        parts.forEach((part, index) => {
          if (part.match(/\\\(|\\\[|\\\)|\\\]/)) {
            return;
          } else if (index > 0 && parts[index - 1].match(/\\\(|\\\[/)) {
            const span = document.createElement('span');
            try {
              katex.render(part, span, { throwOnError: false });
            } catch (error) {
              span.textContent = part;
            }
            fragment.appendChild(span);
          } else {
            fragment.appendChild(document.createTextNode(part));
          }
        });

        if (node.parentNode) {
          node.parentNode.replaceChild(fragment, node);
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        Array.from(node.childNodes).forEach(traverseNodes);
      }
    };

    Array.from(tempContainer.childNodes).forEach(traverseNodes);

    container.innerHTML = '';
    container.appendChild(tempContainer);
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
    if (message.feedback === feedback) {
      message.feedback = 'nofbk';
      this.requestService.sendFeedback('nofbk', message.messageid);
    } else {
      message.feedback = feedback;
      this.requestService.sendFeedback(feedback, message.messageid);
    }
  }

  sendMessage(message: any) {
    this.promptModel = message;
    this.submit();
    this.cd.detectChanges();
  }

  sendMessageByVoice(promptData: any) {
    this.promptModel = promptData.text;
    this.submit();
    this.cd.detectChanges();
  }

  // Survey methods
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

  /**
   * Handle user logout
   */
  onLogout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
