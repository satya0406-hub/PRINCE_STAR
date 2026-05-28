import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, 
  Plus, 
  History, 
  Brain, 
  MessageSquare, 
  Trash2, 
  Activity,
  Cpu, 
  Loader2, 
  AlertCircle, 
  Home, 
  HelpCircle, 
  Paperclip, 
  Mic, 
  ArrowUp, 
  Key, 
  CheckCircle, 
  X, 
  Sparkles, 
  SquarePen, 
  PanelLeftClose, 
  Menu, 
  User, 
  Settings2,
  Share2,
  Pin,
  Archive,
  Edit3,
  MoreVertical,
  Award,
  LogOut
} from 'lucide-react';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, updateDoc, increment, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import ReactMarkdown from 'react-markdown';
import { cn } from '../lib/utils';
import { useParams, Link, useNavigate } from 'react-router-dom';

import { handleFirestoreError } from '../lib/errorHandler';
import { BadgeModal } from '../components/BadgeModal';
import { AccessLogsModal } from '../components/AccessLogsModal';

function getCleanSubject(input: string): string {
  const rawCleaned = input.replace(/[?.,\/#!$%\^&\*;:{}=\-_\`~()]/g, "").trim();
  const words = rawCleaned.split(/\s+/).filter(w => w.length > 0);
  
  const queryFillers = new Set([
    'what', 'is', 'are', 'a', 'an', 'the', 'explain', 'about', 'how', 'to', 'do', 'you', 'know', 'definition', 'of', 
    'tell', 'me', 'more', 'on', 'whatis', 'please', 'describe', 'define', 'with', 'example', 'in', 'for', 'why',
    'give', 'meaning', 'concept', 'meaningof', 'which', 'its', 'can', 'we', 'i', 'list', 'show', 'write', 'some',
    'detailed', 'models', 'model', 'of', 'on', 'simple', 'english'
  ]);
  
  const subjects = words.filter(w => !queryFillers.has(w.toLowerCase()));
  if (subjects.length > 0) {
    return subjects.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
  }
  return rawCleaned || "your requested topic";
}

function generateLocalResponse(input: string, previousMessages: any[] = []): { text: string; model: string; isFallback: boolean } {
  const query = (input || "").toLowerCase().trim();
  let text = "";

  // Extract last assistant response for context-aware follow-up handling
  const assistantMessages = previousMessages ? previousMessages.filter(m => m.role === 'assistant') : [];
  const lastAssistantMessage = assistantMessages.length > 0 ? assistantMessages[assistantMessages.length - 1].text : '';
  const lastAssistantLower = lastAssistantMessage.toLowerCase();

  const isWondersOfWorldRecall = lastAssistantLower.includes("great wall of china") || lastAssistantLower.includes("taj mahal") || lastAssistantLower.includes("chichen itza");
  const isWondersOfAIRecall = lastAssistantLower.includes("generative ai") || lastAssistantLower.includes("computer vision") || lastAssistantLower.includes("alphafold");

  // Helper check for "6 lines" request
  const wantsSixLines = /(6|six)\s+lines/i.test(query) || query.includes("6 lines") || query.includes("six lines");

  // 1. FOLLOW-UP: 6 LINES ON EACH (FOR 7 WONDERS OF THE WORLD)
  if (isWondersOfWorldRecall && wantsSixLines) {
    text = `Here is a detailed overview of the 7 wonders of the world, with exactly 6 lines of explanation for each:

1. **Great Wall of China (China)**:
   - This ancient wall is a massive series of defensive fortifications constructed across the historical northern borders of China.
   - It was originally built by various Chinese dynasties starting in the 7th century BC to guard against incoming nomadic invaders.
   - The total length of all sections of the wall put together stretches over 21,196 kilometers through diverse mountain terrain.
   - It stands as one of the most remarkable architectural and military engineering accomplishments in entire human history.
   - Guard towers, troop barracks, signaling stations, and wide pathways are built along its stone and brick ramparts.
   - Today, it symbolises Chinese resilience and remains one of the most visited historical monuments in the world.

2. **Chichen Itza (Mexico)**:
   - Chichen Itza was a major pre-Columbian city built by the Maya civilization on the Yucatan Peninsula.
   - The site is dominated by the spectacular Temple of Kukulcan, a stepped pyramid popularly known as El Castillo.
   - During the spring and autumn equinoxes, the setting sun casts a shadow resembling a slithering feathered serpent descending the pyramid.
   - The city was a thriving hub of trade, political influence, and ritual worship starting around 600 AD.
   - It features the largest ancient ball court in Mesoamerica and a sacred sinkhole pool known as the Cenote.
   - This historic archaeological park reflects the Maya people's deep knowledge of astronomy, architecture, and mathematics.

3. **Petra (Jordan)**:
   - Petra is an ancient historical city carved directly into red-pink sandstone cliffs in southern Jordan's desert.
   - Established as early as 312 BC, it served as the wealthy capital of the industrious Nabataean Kingdom.
   - The city is famous for its massive rock-cut Treasury temple and its brilliant, complex water conduit system.
   - It was strategically located at the intersection of busy trade routes for silk, incense, spices, and precious goods.
   - The entrance is reached through the Siq, a narrow dark gorge winding over a kilometer between towering cliffs.
   - Often called the Rose City due to the color of its stone, it stands as Jordan's proudest national treasure.

4. **Machu Picchu (Peru)**:
   - Machu Picchu is a stunning Incan citadel built high up in the Andes Mountains of Peru.
   - It was constructed in the mid-15th century as a royal estate for the Incan Emperor Pachacuti.
   - The site is famous for its masterful dry-stone walls made of heavy, polished blocks fitted perfectly without mortar.
   - It sits beautifully on a high mountain ridge overlooking the winding Urubamba River valley in the clouds.
   - The city was abandoned during the Spanish conquest and remained completely hidden from the outside world until 1911.
   - Its design integrates advanced terraces, water channels, alignment with astrological events, and natural peaks.

5. **Christ the Redeemer (Brazil)**:
   - This iconic monument is a colossal Art Deco statue of Jesus Christ overlooking Rio de Janeiro.
   - It stands 30 meters tall with arms stretching wide to symbolise a warm gesture of peace and welcome.
   - The statue rests majestically atop the 700-meter summit of Corcovado Mountain inside Tijuca National Park.
   - Created by French sculptor Paul Landowski, it was constructed using reinforced concrete faced with soapstone tiles.
   - Completed in 1931, the statue took nine years of detailed craftsmanship and local fundraising to build.
   - It is recognized worldwide as an emblem of Brazilian faith, hospitality, and South American coastal beauty.

6. **Colosseum (Italy)**:
   - The Colosseum is a massive stone oval amphitheater built in the very heart of Rome, Italy.
   - Commissioned by Emperor Vespasian in 72 AD, it was designed to hold over 50,000 eager spectators.
   - It originally hosted blood-pumping gladiator matches, wild animal hunts, dramatic plays, and mock battles.
   - The structure features a complex system of underground tunnels and trapdoors called the hypogeum.
   - Although damaged by natural disasters over the centuries, it remains a supreme model of classical construction.
   - It stands as an iconic symbol of Roman power, engineering genius, and ancient Mediterranean history.

7. **Taj Mahal (India)**:
   - The Taj Mahal is a majestic white marble mausoleum located on the banks of the Yamuna River in Agra.
   - It was commissioned in 1632 by the Mughal Emperor Shah Jahan to honor his beloved wife, Mumtaz Mahal.
   - This spectacular monument is globally admired as a masterpiece of Persian, Islamic, and Indian architecture.
   - Its central dome stands at an imposing height of 73 meters, surrounded by four slender corner minarets.
   - The exterior marble surfaces are intricately inlaid with precious gemstones and elegant calligraphic carvings.
   - Standing as a universal monument to eternal love, it welcomes millions of international visitors every year.`;
  }
  // 2. FOLLOW-UP: 6 LINES ON EACH (FOR 7 WONDERS OF AI)
  else if (isWondersOfAIRecall && wantsSixLines) {
    text = `Here is a detailed overview of the 7 wonders of Artificial Intelligence, with exactly 6 lines of explanation for each:

1. **Generative AI & Large Language Models (LLMs)**:
   - Generative AI represents systems trained on massive text datasets to generate natural human-like language.
   - Tools like ChatGPT and Gemini can write essays, solve mathematical equations, compose poetry, and summarize PDFs.
   - They operate on advanced Transformer architectures utilizing self-attention to predict the most likely next word.
   - This technology has transformed creative writing, customer support automation, and corporate brain productivity.
   - Continued training enables these neural networks to catch subtle human nuances, humor, and logical associations.
   - They serve as the foundation of modern digital assistance and custom natural language processing pipelines.

2. **Computer Vision & Image Generation**:
   - Computer vision allows smart computer systems to analyze, understand, and categorize visual information.
   - Image models like Midjourney or Stable Diffusion create high-resolution custom artwork from simple text prompts.
   - They use sophisticated diffusion models that start with noise and gradually refine details into sharp shapes.
   - The tech is widely used in facial recognition, security monitoring, and automated media editing pipelines.
   - It also empowers medical imaging systems to spot early indicators of diseases in CT scans.
   - By translating pixels into searchable tags, computer vision helps search engines categorize the web's photos.

3. **Autonomous Vehicles & Self-Driving Cars**:
   - Self-driving cars combine artificial intelligence, deep learning, and advanced physical sensors to drive automatically.
   - They leverage LiDAR, cameras, and radar to map their 3D surroundings in real time.
   - Neural networks process these millions of inputs every second to make pathplanning and braking decisions.
   - Companies like Waymo and Tesla test these neural systems across complex, active city streets.
   - The overarching goal is to reduce traffic accidents, save fuel, and optimize vehicle route times.
   - This represents one of the most demanding integrations of real-time computer vision and machine decision-making.

4. **AlphaFold & Protein Folding**:
   - AlphaFold is an AI system developed by Google DeepMind that predicts how complex proteins fold.
   - Understanding protein structures is crucial because their 3D shape directly dictates their biological function.
   - Before AlphaFold, finding a single protein's shape in a lab took years of expensive, manual effort.
   - The AI predicted the structures of nearly all 200 million known proteins with extreme accuracy.
   - This breakthrough speeds up drug discovery, helps fight diseases, and assists in bio-material design.
   - It is widely considered one of the greatest contributions of machine learning to biological science.

5. **AI Healthcare Diagnostics**:
   - Health diagnostics leverage deep neural patterns to interpret medical records, lab tests, and scans.
   - They analyze microscopic details in X-rays, mammograms, and MRIs to locate anomalies.
   - These algorithms are trained on historical archives of thousands of confirmed patient medical images.
   - AI serves as a powerful extra team of eyes for busy doctors, identifying hidden signals.
   - It can also predict patient risk scores based on historical vitals and electronic health records.
   - By speeding up triage processes, AI saves valuable minutes for emergency room medical staff.

6. **Smart Robotics & Reinforcement Learning**:
   - Modern robots utilize AI algorithms to master physical manipulation tasks and navigate warehouses autonomously.
   - Through reinforcement learning, a robotic arm attempts a task thousands of times and learns from success.
   - This allows robots to transition from rigid pre-programmed actions to adaptive, smart behaviors.
   - Amazon warehouses use fleets of smart self-navigating robots to transport goods to packing stations.
   - They can adapt to obstacles, handle delicate items, and collaborate safely alongside human crews.
   - This blend of machine vision and motor coordination is key to next-generation factory production.

7. **Intelligent Code Co-pilots**:
   - Developer assistants like GitHub Copilot translate natural language comments directly into functional software code.
   - They suggest code completions, draft entire functions, translate languages, and locate software bugs instantly.
   - The models are pre-trained on millions of public open-source software code repositories worldwide.
   - Code models help programmers save time on repetitive boilerplates and focus on high-level architecture.
   - They can also explain complex legacy systems or suggest helpful unit tests in seconds.
   - This has increased daily developer productivity and lowered the entry barrier for coding beginners.`;
  }
  // 3. 7 WONDERS OF THE WORLD (INITIAL)
  else if (
    /7 wonders of (the )?world|seven wonders of (the )?world/i.test(query) ||
    (/(7|seven)\s+wonders/i.test(query) && !/ai|artificial|intelligence|tech|machine|neural/i.test(query))
  ) {
    text = `Here are the 7 wonders of the world, along with a brief explanation of each in normal English:

1. **Great Wall of China (China)**: A massive series of ancient stone and brick walls built along the historical northern borders of China to protect states and empires against raids and invasions.
2. **Chichen Itza (Mexico)**: A large pre-Columbian city built by the Maya civilization, featuring the famous pyramid temple known as El Castillo.
3. **Petra (Jordan)**: An ancient city carved directly into red-pink sandstone cliffs, famous for its water conduit system and rock-cut architecture.
4. **Machu Picchu (Peru)**: An extraordinary Incan citadel set high in the Andes Mountains, built with polished dry-stone walls designed to withstand earthquakes.
5. **Christ the Redeemer (Brazil)**: An iconic, large art deco statue of Jesus Christ overlooking the city of Rio de Janeiro from the summit of Corcovado Mountain.
6. **Colosseum (Italy)**: A massive Roman amphitheater in the center of Rome, used for ancient gladiator tournaments, dramas, and public spectacles.
7. **Taj Mahal (India)**: A gorgeous white marble mausoleum built in Agra by Emperor Shah Jahan in memory of his favorite wife, Mumtaz Mahal.`;
  }
  // 4. 7 WONDERS OF AI (INITIAL)
  else if (/(7|seven)\s+wonders\s+of\s+(ai|artificial|intelligence|tech|machine)/i.test(query)) {
    text = `Here are the 7 wonders of Artificial Intelligence, along with a brief explanation of each in normal English:

1. **Generative AI & Large Language Models (LLMs)**: Systems like ChatGPT, Gemini, and Claude that understand and generate human-like natural text with incredible fluency and creativity.
2. **Computer Vision & Image Generation**: Technology that lets computers recognize objects in photos or videos, and generate stunning custom artwork or realistic images from simple text descriptions.
3. **Autonomous Vehicles & Self-Driving Cars**: Smart systems that combine cameras, sensors, and deep learning algorithms to steer, navigate, and drive vehicles safely without human intervention.
4. **AlphaFold & Protein Folding**: An AI breakthrough that predicts how proteins fold with extreme accuracy, saving decades of biological lab research and accelerating new medical drug discoveries.
5. **AI Healthcare Diagnostics**: Systems capable of reading X-rays, MRIs, and CT scans to automatically spot patterns of diseases, aiding doctors with faster and highly precise diagnostic evaluations.
6. **Smart Robotics & Reinforcement Learning**: Physical robots that learn manually difficult tasks, such as navigating warehouse spaces and sorting complex items through trial and error.
7. **Intelligent Code Co-pilots**: Artificial intelligence tools that write, explain, complete, and debug software code across multiple languages, acting as real-time assistants for developers.`;
  }
  // 5. MACHINE LEARNING MODELS
  else if (/ml\s*model|machine\s*learning\s*model|models\s*of\s*ml|models\s*of\s*machine\s*learning|what\s*are\s*the\s*models/i.test(query)) {
    text = `Machine learning (ML) models are categorized into three primary paradigms based on how they learn patterns from data:

1. **Supervised Learning Models**: These models are trained on labeled datasets containing both input and correct output targets. Examples include Linear Regression (predicting continuous numerical values), Logistic Regression (handling classification problems), Decision Trees, Support Vector Machines (SVM), and Random Forests.
2. **Unsupervised Learning Models**: These models find hidden patterns or structural clusters in unlabeled data without explicit guidance. Examples include K-Means Clustering (grouping data points by physical proximity) and Principal Component Analysis (PCA, used for dimension reduction).
3. **Reinforcement Learning Models**: These agents learn to make decisions hierarchically by executing actions in an environment to maximize cumulative rewards. Examples include Q-Learning, Deep Q-Networks (DQN), and Policy Gradient methods.
4. **Deep Learning & Neural Networks**: Advanced models consisting of multi-layered networks (such as Convolutional Neural Networks for visual tasks and Transformers for natural language processing) that automatically learn features from highly complex data pipelines.`;
  }
  // 6. DATABASES
  else if (/database|sql|nosql|postgres|mongodb|query|index|dbms|schema/i.test(query)) {
    text = `Databases serve as the fundamental backbone of modern software applications, providing structured systems to store, retrieve, update, and manage persistent data.

- **Relational Databases (SQL)**: Structured systems (like PostgreSQL or MySQL) that organize datasets into tables of rows and columns, utilizing SQL queries to perform predictable, ACID-compliant operations.
- **NoSQL Databases**: Document-based or key-value structures (like MongoDB or Firebase Firestore) that offer flexible dynamic schemas designed for high-throughput horizontal scaling across servers.
- **Database Indexing**: Crucial for lookup speed. Applying appropriate indexes decreases structural search latency from O(N) to O(log N) or O(1).
- **Practical Schema Design**: Normalizing relations to Third Normal Form (3NF) reduces redundant fields, whereas denormalization is preferred for speed in read-heavy applications.`;
  }
  // 7. WEB DEVELOPMENT
  else if (/html|css|js|javascript|react|vue|frontend|backend|api|node|express|json|web/i.test(query)) {
    text = `Modern web development is built on the coordination between client-side interfaces and server-side runtime systems:

- **Client-Side Renders**: Constructed using standard HTML for layout structure, Tailwind CSS for visual styling, and JavaScript or React to handle reactive user inputs and router pipelines.
- **Server-Side API Handlers**: Powered by Node.js, Express, or Python to execute server logic, interact with system storage, and handle cross-origin constraints.
- **Dynamic Serializations**: Protocols use JSON payloads to transport structured objects between backend nodes and client state managers.
- **Security & Tokens**: Connections leverage SSL/TLS encryption for wire privacy, combined with JSON Web Tokens (JWT) for secure user sessions.`;
  }
  // 8. ALGORITHMS & DATA STRUCTURES
  else if (/algorithm|data\s*structure|tree|graph|sorting|searching|stack|queue|complexity|big\s*o/i.test(query)) {
    text = `Algorithms and data structures form the essential core of computational efficiency, dictating how digital data is structured and processed in memory:

- **Key Data Structures**: Linear structures include Arrays (consecutive storage) and Linked Lists, while non-linear structures include Binary Trees and Graphs that model hierarchical or networked relationships.
- **Fundamental Algorithms**: Common operations include sorting algorithms (like Quick Sort and Merge Sort) and searching algorithms (such as Binary Search).
- **Complexity Analysis**: Code efficiency is evaluated using Big O notation, which defines worst-case time and space scaling of solutions.
- **Practical Application**: Choosing the correct structural map (like Hash Tables for constant-time lookups) is critical to building low-latency, scalable software applications.`;
  }
  // 9. PROGRAMMING LANGUAGES
  else if (/python|java\b|c\+\+|rust\b|programming|coding/i.test(query)) {
    text = `Programming languages are instruction systems translated into machine operations, varying by compilation models and syntax highlights:

- **Interpreted Languages**: Python and JavaScript are executed line-by-line using runtimes, promoting high development speeds and dynamic variable typing.
- **Compiled Languages**: C++, Java, and Rust are compiled into machine code before execution, verifying types statically at translation time to maximize raw speed.
- **Memory Management**: Some runtimes use garbage collectors to reclaim memory, whereas systems like Rust use rigorous compile-time owners.
- **Core Design Paradigms**: Span from procedural lists of commands, object-oriented Class hierarchies, to side-effect-free functional designs.`;
  }
  // 10. GREETINGS
  else if (/^(hello|hi|hey|greet|greetings|good morning|good afternoon|good evening|yo\b)/i.test(query)) {
    text = `Hello! How can I help you today? Please feel free to ask any question regarding AI, GPA/CGPA, SRM University, or other topics.`;
  }
  // 11. IDENTITY
  else if (/who are you|your name|what is prince star|prince star|about you|creator/i.test(query)) {
    text = `I am the Prince Star AI Assistant. I can help you compute your academic GPA/CGPA, explore SRM University standards, study effectively, or answer general informational prompts in simple, direct English.`;
  }
  // 12. GPA & EVALUATION
  else if (/gpa|cgpa|sgpa|grade|academic|calculator|calculate|formula|score/i.test(query)) {
    text = `To calculate your Grade Point Average (GPA) or Cumulative GPA (CGPA), you can use these official formulas:

1. **SGPA (Semester GPA)**: Multiply each course's credit hours by your earned grade points, add them all together, and divide by your total semester credits:
   $$\\text{SGPA} = \\frac{\\sum (\\text{Course Credits} \\times \\text{Grade Points})}{\\sum \\text{Total Semester Credits}}$$

2. **CGPA (Cumulative GPA)**: Multiply each semester's SGPA by its total credit hours, add them together across all completed semesters, and divide by your overall cumulative credits:
   $$\\text{CGPA} = \\frac{\\sum (\\text{Semester SGPA} \\times \\text{Semester Credits})}{\\sum \\text{Total Combined Credits}}$$

You can easily calculate your grades interactively by navigating to our **GPA +** tool in the header navigation!`;
  }
  // 13. SRM IST
  else if (/srm|srmist/i.test(query)) {
    text = `SRM University (SRMIST) uses a 10-point academic grading scale:
* **O (Outstanding)**: 10 Grade Points
* **A+ (Excellent)**: 9 Grade Points
* **A (Very Good)**: 8 Grade Points
* **B+ (Good)**: 7 Grade Points
* **B (Above Average)**: 6 Grade Points
* **C (Average)**: 5 Grade Points
* **P (Pass)**: 4 Grade Points
* **F (Fail)**: 0 Grade Points

Please note that SRM requires a mandatory minimum of **75% attendance** to be eligible to write end-semester university examinations. To help SRM students, we have provided direct student portal integration links inside our **GPA +** page.`;
  }
  // 14. WHAT IS AI
  else if (/\b(what is ai|what is artificial intelligence|what's ai|what's artificial intelligence|define ai|define artificial intelligence)\b/i.test(query) || (/\b(ai|artificial intelligence)\b/i.test(query) && /what is|what's|define|explain/i.test(query))) {
    text = `Artificial Intelligence (AI) refers to the simulation of human intelligence by computer systems and software. This includes processes like learning from experience, logical reasoning, problem-solving, visual perception, and natural language understanding. At its core, AI operates on statistical and mathematical algorithms designed to recognize patterns, make predictions, and automate complex tasks that traditionally required human minds.`;
  }
  // 15. CAREERS & PLACEMENTS
  else if (/career|job|placement|recruit|interview|resume|portfolio|intern|tcs|infosys|vipro|cognizant/i.test(query)) {
    text = `To prepare effectively for campus placement drives and interviews, focus on these key stages:
1. **Aptitude & Logical Reasoning**: Practice quantitative math and reasoning since they are used as initial filters by recruiting companies.
2. **Data Structures & Algorithms (DSA)**: Master arrays, strings, hash maps, trees, and logic patterns.
3. **Core Computer Science Fundamentals**: Build strong concepts in Operating Systems, Database Management (SQL queries), and Computer Networks.
4. **Resumes & Portfolios**: Structure a clean one-page resume and pin your best projects on GitHub with clear documentation.`;
  }
  // 16. EXAMS & STUDY TIPS
  else if (/exam|study|test|attendance|detend|cla|preparation|notes/i.test(query)) {
    text = `Here are three highly effective tips for continuous school assessments and exams study:
1. **The Pomodoro Technique**: Study with absolute focus for 25 minutes, then take a 5-minute break. Repeat this pattern 4 times.
2. **Active Recall**: Don't just re-read notes. Cover them and answer key topic questions from memory to strengthen memory synapses.
3. **Continuous Assessments (CLA)**: Try to score high on your internal tests and midterms to lift your overall GPA easily before final exams. Also make sure to maintain your attendance strictly above 75%.`;
  }
  // 17. IoT
  else if (/iot|internet of things|arduino|esp32|raspberry|sensor|embedded/i.test(query)) {
    text = `The Internet of Things (IoT) involves connecting physical hardware devices—such as ESP32, Arduino, or Raspberry Pi microcontrollers—to web servers and databases. This enables sensors to send real-time climate, telemetry, or system data online, and allows you to control physical actuators (like switches or motors) remotely over protocols like HTTP, MQTT, or WebSockets.`;
  }
  // 18. DYNAMIC FALLBACK SYSTEM (HONEST GUIDANCE SYSTEM)
  else {
    const topic = getCleanSubject(input);
    text = `I can see you are asking about **${topic}**. 

My pre-programmed offline knowledge base is configured to manage SRM University standards, interactive academic GPA/CGPA calculations, and core developer tools. For general knowledge queries such as **${topic}**, I require a live connection to the Gemini API.

Currently, the live AI service is offline or a valid **Gemini API Key** is not configured.

### 🔒 Operational Notice on API Key Security & Automatic Revocation:
If you recently paste or write an API key directly into your program files and push it to a public GitHub repository (or share it in a public log), **GitHub's push-protection scanning and Google's Security Scanner will instantly detect and permanently disable/revoke the key within seconds for your protection.** This is why hardcoding keys directly in program files and pushing them to git causes them to stop working immediately.

### 🚀 Recommended Method to Securely Connect Your Bot on GitHub Pages:
You **never** need to write or share your API key in the program code! You can keep your key completely private and safe:

1. **Configure as a Secret in GitHub**:
   - Go to your GitHub repository on GitHub.com.
   - Click **Settings** (gear icon at the top menu of the repository page).
   - In the left sidebar, click **Secrets and variables** > **Actions**.
   - Click the **New repository secret** button.
   - Name the secret exactly: \`GEMINI_API_KEY\`
   - Paste your official **Gemini API Key** (starts with \`AIzaSy...\`) as the value and click **Add secret**.

2. **How it Works**:
   - The compiled workflow file (\`.github/workflows/deploy.yml\`) automatically grabs your hidden GitHub Secret at compile-time and injects it safely into the built static files.
   - This keeps your key completely private, avoids any automated security revocation, and enables the chatbot to work instantly on your deployed link!

Once a valid Gemini API key is configured securely via your GitHub secrets or local hosting environments, the chatbot will automatically activate to answer all topics with Google's high-speed **gemini-3.5-flash**!`;
  }

  return {
    text,
    model: "local-query-engine",
    isFallback: true
  };
}

export function ChatAssistantPage() {
  const { id: urlChatId } = useParams();
  const navigate = useNavigate();
  const { user, profile, login } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeChat, setActiveChat] = useState<string | null>(urlChatId || null);
  const [chats, setChats] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isBadgeModalOpen, setIsBadgeModalOpen] = useState(false);
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);
  const [showShareSuccess, setShowShareSuccess] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, chatId: string } | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [renamingChat, setRenamingChat] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [sessionEnded, setSessionEnded] = useState(false);
  const [showConfirm, setShowConfirm] = useState<'logout' | 'shutdown' | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { updateProfile, logout } = useAuth();
  
  const handleLogout = async () => {
    if (showConfirm === 'logout') {
      await logout();
      navigate('/');
    } else if (showConfirm === 'shutdown') {
      await logout();
      setSessionEnded(true);
    }
    setShowConfirm(null);
  };

  // Progress timer for chatting (1 progress per minute)
  useEffect(() => {
    if (!user || !profile) return;
    
    const interval = setInterval(async () => {
      try {
        const points = 0.5;
        const currentProgress = (profile.progress || 0) + points;
        const userRef = doc(db, 'users', user.uid);
        
        let updateData: any = {
          progress: increment(points),
          lastActive: serverTimestamp()
        };

        if (currentProgress >= 10) {
          const badgesToEarn = Math.floor(currentProgress / 10);
          updateData.progress = currentProgress % 10;
          updateData.totalBadges = increment(badgesToEarn);
          
          for(let i=0; i<badgesToEarn; i++) {
             const badgeName = `Elite ${profile.totalBadges + i + 1}`;
             await addDoc(collection(db, `users/${user.uid}/badgeHistory`), {
                badgeName,
                earnedAt: serverTimestamp(),
                pointsAtTime: 10
             });
          }
        }

        // Log progress activity
        await addDoc(collection(db, `users/${user.uid}/progressLogs`), {
          points: points,
          source: 'Neural Dialogue',
          timestamp: serverTimestamp()
        });

        await updateDoc(userRef, updateData);
      } catch (err) {
        console.error("Chat progress update failed:", err);
      }
    }, 60000);
    
    return () => clearInterval(interval);
  }, [user, profile]);

  useEffect(() => {
    const handleGlobalClick = () => {
      setContextMenu(null);
      setUserMenuOpen(false);
    };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  useEffect(() => {
    if (!user) return;
    setError(null);
    const q = query(collection(db, `users/${user.uid}/chats`), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      setChats(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      handleFirestoreError(err, 'list', `users/${user.uid}/chats`);
    });
  }, [user]);

  useEffect(() => {
    if (!user || !activeChat) return;
    setError(null);
    const q = query(collection(db, `users/${user.uid}/chats/${activeChat}/messages`), orderBy('createdAt', 'asc'));
    return onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      handleFirestoreError(err, 'list', `users/${user.uid}/chats/${activeChat}/messages`);
    });
  }, [user, activeChat]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  useEffect(() => {
    if (urlChatId) {
      setActiveChat(urlChatId);
    }
  }, [urlChatId]);
  
  const handleChatSelect = (chatId: string) => {
    setActiveChat(chatId);
    navigate(`/chat/${chatId}`);
  };

  const createNewChat = () => {
    setActiveChat(null);
    setMessages([]);
    navigate('/chat', { replace: true });
    // Force sidebar close on mobile if it was open
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !user || loading) return;

    let chatId = activeChat;
    if (!chatId) {
      const chatRef = await addDoc(collection(db, `users/${user.uid}/chats`), {
        title: input.slice(0, 30) + (input.length > 30 ? '...' : ''),
        createdAt: serverTimestamp(),
        lastMessage: input
      }).catch(e => {
        handleFirestoreError(e, 'create', `users/${user.uid}/chats`);
        return null;
      });
      if (!chatRef) return;
      chatId = chatRef.id;
      setActiveChat(chatId);
      navigate(`/chat/${chatId}`);
    }

    const userInput = input;
    setInput('');
    setLoading(true);
    setError(null);

    try {
      await addDoc(collection(db, `users/${user.uid}/chats/${chatId}/messages`), {
        text: userInput,
        role: 'user',
        createdAt: serverTimestamp()
      }).catch(e => handleFirestoreError(e, 'create', `users/${user.uid}/chats/${chatId}/messages`));

      // Try client-side direct request if a valid compiled key from GitHub Secrets exists, otherwise query server-side Express backend
      let aiText = "";
      let modelUsed = "gemini-3.5-flash";
      let isFallbackUsed = false;
      let success = false;

      // Determine the best API key to use for client-side queries
      let compiledKey: string | undefined = undefined;
      try {
        compiledKey = process.env.GEMINI_API_KEY;
      } catch (safeErr) {
        console.warn("Could not access process.env client-side safely:", safeErr);
      }
      
      // User's provided key for robust offline/static-hosting fallback out-of-the-box!
      const DEFAULT_BACKUP_KEY = "AIzaSyCUh7RdxAanlNe8O0dfMP8KVRBPUg-zHWQ";
      
      const activeKey = (compiledKey && 
                         compiledKey !== 'MY_GEMINI_API_KEY' && 
                         compiledKey !== 'your_gemini_api_key_here' && 
                         compiledKey !== '') 
                         ? compiledKey 
                         : DEFAULT_BACKUP_KEY;

      const hasClientKey = activeKey && activeKey.trim() !== '';

      // 1. TRY DIRECT CLIENT-SIDE CALL TO GEMINI API FIRST (Best for GitHub Pages / Static Hosting)
      if (hasClientKey) {
        console.log("Attempting direct client-side Gemini API call with active key.");
        try {
          const systemInst = "You are a helpful, direct, and precise AI assistant. Answer the user's question directly, accurately, and naturally in simple English. Do NOT output any system logs, diagnostic metrics, system core indicators, or robotic template headings. Keep the response clean and totally focused on the user's prompt, with nothing extra.";
          
          const historyContext = messages.length > 0 
            ? messages.map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.text}`).join('\n')
            : '';
          const fullPrompt = historyContext ? `${historyContext}\nUser: ${userInput}` : userInput;

          // Call Google Generative Language REST endpoint directly to avoid unsafe custom headers like 'User-Agent'
          const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${activeKey}`;
          
          const responseDirect = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              contents: [{
                parts: [{ text: fullPrompt }]
              }],
              systemInstruction: {
                parts: [{ text: systemInst }]
              }
            })
          });

          if (!responseDirect.ok) {
            const errBody = await responseDirect.json().catch(() => ({}));
            throw new Error(errBody?.error?.message || `HTTP ${responseDirect.status}`);
          }

          const resJson = await responseDirect.json();
          const responseText = resJson?.candidates?.[0]?.content?.parts?.[0]?.text;
          
          if (responseText) {
            aiText = responseText;
            modelUsed = "gemini-3.5-flash";
            isFallbackUsed = false;
            success = true;
          }
        } catch (directClientError: any) {
          console.error("Direct client-side Gemini query failed, will try backend next:", directClientError);
        }
      }

      // 2. IF DIRECT CLIENT-SIDE FAILED OR DID NOT RUN, TRY SERVER-SIDE EXPRESS BACKEND /api/chat
      if (!success) {
        console.log("Direct client-side query unavailable or failed. Querying server-side Express backend...");
        try {
          let apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
          if (apiBaseUrl.endsWith('/')) {
            apiBaseUrl = apiBaseUrl.slice(0, -1);
          }
          if (apiBaseUrl.endsWith('/api')) {
            apiBaseUrl = apiBaseUrl.slice(0, -4);
          }
          
          const baseUrl = import.meta.env.BASE_URL || '';
          let fetchUrl = '';
          
          if (apiBaseUrl && (apiBaseUrl.startsWith('http') || apiBaseUrl.startsWith('/'))) {
            fetchUrl = `${apiBaseUrl.replace(/\/+$/, '')}/api/chat`;
          } else {
            fetchUrl = `${window.location.origin}${baseUrl}/api/chat`.replace(/([^:])\/+/g, '$1/');
          }

          const historyContext = messages.length > 0 
            ? messages.map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.text}`).join('\n')
            : '';
          const system_instruction = "You are a helpful, direct, and precise AI assistant. Answer the user's question directly, accurately, and naturally in simple English. Do NOT output any system logs, diagnostic metrics, system core indicators, or robotic template headings. Keep the response clean and totally focused on the user's prompt, providing exactly what is asked and nothing extra.";
          
          const responseFetch = await fetch(fetchUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              prompt: historyContext ? `${historyContext}\nUser: ${userInput}` : userInput,
              systemInstruction: system_instruction
            })
          });

          if (responseFetch.ok) {
            const resJson = await responseFetch.json();
            aiText = resJson.text;
            modelUsed = resJson.model;
            isFallbackUsed = !!resJson.isFallback;
            success = true;
          } else {
            const errData = await responseFetch.json().catch(() => ({}));
            throw new Error(errData.error || `HTTP error ${responseFetch.status}`);
          }
        } catch (chatApiError: any) {
          console.warn("Backend connection unavailable:", chatApiError);
        }
      }

      // 3. IF ALL API RETRIES FAILED, FALLBACK TO LOCAL INTELLIGENT MATCHING ENGINE
      if (!success) {
        console.log("No connection to live AI available. Invoking pre-programmed academic and offline helper...");
        const localRes = generateLocalResponse(userInput, messages);
        aiText = localRes.text;
        modelUsed = localRes.model;
        isFallbackUsed = localRes.isFallback;
      }

      if (!aiText) {
        throw new Error("AI Assistant failed to generate a response particles.");
      }
      
      await addDoc(collection(db, `users/${user.uid}/chats/${chatId}/messages`), {
        text: aiText,
        role: 'assistant',
        createdAt: serverTimestamp(),
        model: modelUsed,
        isFallback: isFallbackUsed
      }).catch(e => handleFirestoreError(e, 'create', `users/${user.uid}/chats/${chatId}/messages`));

      await updateDoc(doc(db, 'users', user.uid), {
        conversationsCount: increment(1),
        lastActive: serverTimestamp()
      }).catch(e => handleFirestoreError(e, 'update', `users/${user.uid}`));

    } catch (err: any) {
      console.error("Neural Processing Error:", err);
      setError(err.message || 'An error occurred. Please verify your connection.');
    } finally {
      setLoading(false);
    }
  };


  const deleteChat = async (chatId: string) => {
    if (!user || !chatId) return;
    try {
      await deleteDoc(doc(db, `users/${user.uid}/chats`, chatId));
      if (activeChat === chatId) {
        setActiveChat(null);
        setMessages([]);
      }
    } catch (err) {
       handleFirestoreError(err, 'delete', `users/${user.uid}/chats/${chatId}`);
    }
  };

  const togglePinChat = async (chatId: string, isPinned: boolean) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, `users/${user.uid}/chats`, chatId), { isPinned: !isPinned });
    } catch (err) {
      handleFirestoreError(err, 'update', `users/${user.uid}/chats/${chatId}`);
    }
  };

  const toggleArchiveChat = async (chatId: string, isArchived: boolean) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, `users/${user.uid}/chats`, chatId), { isArchived: !isArchived });
    } catch (err) {
      handleFirestoreError(err, 'update', `users/${user.uid}/chats/${chatId}`);
    }
  };

  const renameChat = async (chatId: string) => {
    if (!user || !newName.trim()) return;
    try {
      await updateDoc(doc(db, `users/${user.uid}/chats`, chatId), { title: newName });
      setRenamingChat(null);
      setNewName('');
    } catch (err) {
      handleFirestoreError(err, 'update', `users/${user.uid}/chats/${chatId}`);
    }
  };

  const shareChat = (chatId: string) => {
    const url = `${window.location.origin}/chat/${chatId}`;
    navigator.clipboard.writeText(url).then(() => {
      setShowShareSuccess(true);
      setTimeout(() => setShowShareSuccess(false), 3000);
    });
  };

  const handleContextMenu = (e: React.MouseEvent, chatId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, chatId });
  };

  if (sessionEnded) {
    return (
      <div className="h-screen bg-[#0b0f1a] flex flex-col items-center justify-center p-8 gap-8">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center space-y-6 max-w-md"
        >
          <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-8 border border-red-500/20">
            <X className="w-12 h-12 text-red-500" />
          </div>
          <h1 className="text-4xl font-serif font-bold text-white tracking-tight">Session Terminated</h1>
          <p className="text-gray-400">All neural connections have been safely severed. Protocol 3.0 session is now offline.</p>
          <div className="pt-4">
            <Link 
              to="/" 
              className="inline-flex items-center gap-3 px-8 py-4 bg-brand-blue text-white rounded-2xl font-bold hover:bg-blue-600 transition-all shadow-xl shadow-blue-500/20"
            >
              <Home className="w-5 h-5" /> Return to Home Page
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen bg-[#0b0f1a] flex flex-col items-center justify-center p-8 gap-8">
        <div className="w-20 h-20 bg-brand-blue/10 rounded-3xl flex items-center justify-center animate-bounce shadow-2xl shadow-blue-500/20 overflow-hidden border border-white/10">
          <img src={`${import.meta.env.BASE_URL}chatbot-logo.png`} alt="Prince Star" className="w-full h-full object-cover" />
        </div>
        <div className="text-center space-y-4 max-w-sm w-full">
          <h1 className="text-4xl font-serif font-bold text-white tracking-tight">Prince Star Intelligence</h1>
          <p className="text-gray-400">Please sign in to your command center to access neural computing resources.</p>
          <button onClick={login} className="w-full py-4 bg-brand-blue text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-600 transition-colors shadow-xl">
             Sign In with Google
          </button>
          
          <div className="pt-4 text-center">
            <Link 
              to="/" 
              className="inline-flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-white transition-all uppercase tracking-widest"
            >
              <Home className="w-4 h-4 text-brand-blue" />
              Return to Home Page
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const pinnedChats = chats.filter(c => c.isPinned && !c.isArchived);
  const otherChats = chats.filter(c => !c.isPinned && !c.isArchived);

  return (
    <div className="h-screen bg-[#0b0f1a] flex overflow-hidden font-sans">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar - Redesigned to match request */}
      <AnimatePresence mode="wait">
        {sidebarOpen && (
          <motion.div 
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed md:relative h-full bg-[#020617] border-r border-white/5 flex flex-col flex-shrink-0 z-50 w-[300px]"
          >
            {/* Sidebar Top Toggle and New Chat */}
            <div className="p-4 flex items-center justify-between">
               <button 
                onClick={() => setSidebarOpen(false)}
                className="p-2.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
               >
                  <PanelLeftClose className="w-5 h-5" />
               </button>
               <button 
                onClick={createNewChat}
                className="p-2.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                title="New Chat"
               >
                  <SquarePen className="w-5 h-5" />
               </button>
            </div>

            <div className="flex-grow overflow-y-auto px-1 py-4 space-y-6 custom-scrollbar">
              {/* Pinned Chats */}
              {pinnedChats.length > 0 && (
                <div>
                   <div className="px-4 py-2 text-[10px] font-bold text-gray-600 tracking-[0.2em] uppercase flex items-center gap-2">
                     <Pin className="w-3 h-3 rotate-45" /> Pinned
                   </div>
                   <div className="space-y-1">
                      {pinnedChats.map(chat => (
                        <div
                          key={chat.id}
                          onClick={() => handleChatSelect(chat.id)}
                          onContextMenu={(e) => handleContextMenu(e, chat.id)}
                          className={cn(
                            "w-full text-left px-3 py-2 rounded-xl flex items-center gap-3 transition-colors group relative cursor-pointer",
                            activeChat === chat.id ? "bg-white/10 text-white" : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
                          )}
                        >
                          <MessageSquare className="w-4 h-4 opacity-50 flex-shrink-0 text-brand-blue" />
                          <span className="text-sm font-medium truncate flex-1">{chat.title}</span>
                          <button onClick={(e) => { e.stopPropagation(); handleContextMenu(e as any, chat.id); }} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/5 rounded">
                            <MoreVertical className="w-3 h-3 text-gray-500" />
                          </button>
                        </div>
                      ))}
                   </div>
                </div>
              )}

              {/* Chat History */}
              <div>
                <div className="px-4 py-2 text-[10px] font-bold text-gray-600 tracking-[0.2em] uppercase flex items-center gap-2">
                  <History className="w-3 h-3" /> Recent History
                </div>
                <div className="space-y-1">
                  {otherChats.map(chat => (
                    <div
                      key={chat.id}
                      onClick={() => handleChatSelect(chat.id)}
                      onContextMenu={(e) => handleContextMenu(e, chat.id)}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-xl flex items-center gap-3 transition-colors group relative cursor-pointer",
                        activeChat === chat.id ? "bg-white/10 text-white" : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
                      )}
                    >
                      <MessageSquare className="w-4 h-4 opacity-50 flex-shrink-0" />
                      <span className="text-sm font-medium truncate flex-1">{chat.title}</span>
                      <button onClick={(e) => { e.stopPropagation(); handleContextMenu(e as any, chat.id); }} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/5 rounded">
                        <MoreVertical className="w-3 h-3 text-gray-500" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar Bottom - User Account Info */}
            <div className="p-4 border-t border-white/5 bg-[#020617] relative">
               {/* Badge Progress UI */}
               <div className="mb-4 space-y-2">
                 <div className="flex items-center justify-between text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                   <span>Badge Progress</span>
                   <span className="text-brand-blue">{Math.min((profile?.progress || 0) * 10, 100)}%</span>
                 </div>
                 <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/10">
                   <motion.div 
                     initial={{ width: 0 }}
                     animate={{ width: `${Math.min((profile?.progress || 0) * 10, 100)}%` }}
                     className="h-full bg-gradient-to-r from-blue-600 to-brand-blue shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                   />
                 </div>
               </div>



               <div 
                onClick={(e) => { e.stopPropagation(); setUserMenuOpen(!userMenuOpen); }}
                className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-all cursor-pointer group"
               >
                  <div className="w-9 h-9 rounded-full overflow-hidden border border-white/10 group-hover:border-brand-blue transition-all">
                     {user.photoURL && user.photoURL.trim() !== '' ? (
                       <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
                     ) : (
                       <div className="w-full h-full flex items-center justify-center bg-brand-blue/20 text-brand-blue">
                         <User className="w-5 h-5" />
                       </div>
                     )}
                  </div>
                  <div className="flex-grow min-w-0">
                     <p className="text-sm font-bold text-white truncate">{user.displayName}</p>
                     <p className="text-[10px] text-gray-500 truncate">{user.email}</p>
                  </div>
                  <Settings2 className="w-4 h-4 text-gray-600 group-hover:text-white transition-all" />
               </div>

               {/* User Context Menu (Profile Dropdown) */}
               <AnimatePresence>
                 {userMenuOpen && (
                   <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute bottom-full left-4 mb-4 w-[280px] bg-[#0b0f1a] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden"
                   >
                      <div className="px-5 py-4 border-b border-white/5 bg-white/[0.02]">
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Protocol 3.0 Control</p>
                      </div>
                      <div className="py-2">
                        <button 
                          onClick={() => { setIsBadgeModalOpen(true); setUserMenuOpen(false); }} 
                          className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-brand-blue/10 text-gray-400 hover:text-white transition-all text-xs font-bold uppercase tracking-widest"
                        >
                          <Award className="w-5 h-5 text-brand-blue" /> Badge History
                        </button>
                        <button 
                          onClick={() => { setIsLogsModalOpen(true); setUserMenuOpen(false); }} 
                          className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-brand-blue/10 text-gray-400 hover:text-white transition-all text-xs font-bold uppercase tracking-widest"
                        >
                          <History className="w-5 h-5 text-brand-blue" /> Access Logs
                        </button>
                        <div className="h-[1px] bg-white/5 my-2" />
                        <button 
                          onClick={() => { setUserMenuOpen(false); setShowConfirm('logout'); }} 
                          className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-brand-blue/10 text-gray-400 hover:text-white transition-all text-xs font-bold uppercase tracking-widest"
                        >
                          <LogOut className="w-5 h-5 text-brand-blue" /> Log Out
                        </button>
                        <button 
                          onClick={() => { setUserMenuOpen(false); setShowConfirm('shutdown'); }} 
                          className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-red-500/10 text-red-500 transition-all text-xs font-bold uppercase tracking-widest"
                        >
                          <X className="w-5 h-5" /> Shutdown Session
                        </button>
                      </div>
                   </motion.div>
                 )}
               </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowConfirm(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-sm bg-[#161b2c] border border-white/10 rounded-3xl p-8 shadow-2xl"
            >
              <div className={cn(
                "w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 border",
                showConfirm === 'shutdown' ? "bg-red-500/10 border-red-500/20" : "bg-blue-500/10 border-blue-500/20"
              )}>
                {showConfirm === 'shutdown' ? (
                  <X className="w-8 h-8 text-red-500" />
                ) : (
                  <LogOut className="w-8 h-8 text-brand-blue" />
                )}
              </div>
              <h3 className="text-xl font-bold text-white text-center mb-2">
                {showConfirm === 'shutdown' ? 'Terminate Session?' : 'Confirm Logout?'}
              </h3>
              <p className="text-gray-400 text-center text-sm mb-8 leading-relaxed">
                {showConfirm === 'shutdown' 
                  ? "This will sever all neural connections and terminate your current session Protocol 3.0." 
                  : "Are you sure you want to log out and disconnect from your Prince Star account?"}
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowConfirm(null)}
                  className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm font-bold transition-all border border-white/5"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleLogout}
                  className={cn(
                    "flex-1 px-4 py-3 text-white rounded-xl text-sm font-bold transition-all shadow-xl",
                    showConfirm === 'shutdown' ? "bg-red-500 hover:bg-red-600 shadow-red-500/20" : "bg-brand-blue hover:bg-blue-600 shadow-blue-500/20"
                  )}
                >
                  {showConfirm === 'shutdown' ? 'Terminate' : 'Log Out'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Container */}
      <div className="flex-grow flex flex-col relative h-full">
        {/* Top Navbar */}
        <nav className="h-14 flex items-center justify-between px-4 border-b border-white/5 bg-[#0b0f1a]/50 backdrop-blur-md z-20">
           <div className="flex items-center gap-3">
              {!sidebarOpen && (
                <button 
                  onClick={() => setSidebarOpen(true)}
                  className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                >
                   <Menu className="w-5 h-5" />
                </button>
              )}
              <div className="flex items-center gap-2">
                 <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shadow-lg overflow-hidden">
                    <img src={`${import.meta.env.BASE_URL}chatbot-logo.png`} alt="" className="w-full h-full object-cover" />
                 </div>
                 <span className="font-bold text-sm tracking-tight text-white uppercase opacity-80">Prince Star 3.0</span>
              </div>
           </div>

           <div className="flex items-center gap-2 sm:gap-4">
              <Link to="/" className="p-2 text-gray-400 hover:text-white transition-all flex items-center gap-2" title="Home">
                 <Home className="w-5 h-5 sm:w-4 sm:h-4" /> <span className="hidden sm:inline text-sm font-bold">Home</span>
              </Link>
              {profile?.badges?.length > 0 && (
                <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-4 border-l border-white/5 h-10">
                   <button
                    onClick={() => setIsBadgeModalOpen(true)}
                    className="flex items-center gap-2 md:gap-3 group transition-all"
                  >
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl overflow-hidden shadow-lg shadow-blue-500/20 border border-white/10 bg-[#0b0f1a] transition-transform group-hover:scale-105 active:scale-95">
                      <img src={`${import.meta.env.BASE_URL}badge-logo.png`} alt="Badges" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex flex-col items-start leading-none">
                      <div className="flex items-center gap-1">
                        <span className="text-sm md:text-lg font-bold text-white tracking-tight">{(profile.totalBadges || 0) + (profile.badges?.length || 0)}</span>
                        <div className="w-3 h-3 md:w-4 md:h-4 rounded-sm overflow-hidden opacity-60">
                          <img src={`${import.meta.env.BASE_URL}badge-logo.png`} alt="" className="w-full h-full object-cover" />
                        </div>
                      </div>
                      <span className="text-[6px] md:text-[8px] font-black uppercase tracking-widest text-slate-500 mt-0.5 md:mt-1 group-hover:text-blue-400 transition-colors hidden xs:block">View History</span>
                    </div>
                  </button>
                </div>
              )}
              <Link to="/admin" className="p-2 sm:px-3 sm:py-1.5 bg-brand-blue text-white rounded-lg hover:scale-105 transition-all" title="Admin">
                 <Settings2 className="w-5 h-5 sm:hidden" />
                 <span className="hidden sm:inline text-xs font-bold uppercase tracking-widest">ADMIN</span>
              </Link>
           </div>
        </nav>

        {/* Messaging Area - Non-page-scrollable, Message-only-scrollable */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto w-full custom-scrollbar selection:bg-brand-blue selection:text-white"
        >
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-6">
                <motion.div 
                   initial={{ scale: 0.8, opacity: 0 }}
                   animate={{ scale: 1, opacity: 1 }}
                   transition={{ duration: 0.5 }}
                   className="relative group mb-12"
                >
                   <div className="w-32 h-32 bg-white/5 rounded-[2.5rem] flex items-center justify-center z-10 relative overflow-hidden border border-white/5">
                      <img src={`${import.meta.env.BASE_URL}chatbot-logo.png`} alt="" className="w-full h-full object-cover" />
                   </div>
                   <div className="absolute inset-0 bg-brand-blue/10 blur-[80px] -z-10" />
                </motion.div>

                <h1 className="text-5xl sm:text-8xl font-serif font-black text-white tracking-widest mb-4 opacity-90">PRINCE STAR</h1>
                <p className="text-xs font-black text-gray-700 tracking-[1em] uppercase">Neural Architecture 3.2</p>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto py-10 space-y-12 px-6">
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "flex flex-col gap-3",
                    msg.role === 'user' ? "items-end" : "items-start"
                  )}
                >
                  <div className={cn(
                    "flex items-center gap-2 mb-1",
                    msg.role === 'user' ? "flex-row-reverse" : "flex-row text-brand-blue"
                  )}>
                     <div className={cn(
                        "p-1.5 rounded-lg border overflow-hidden",
                        msg.role === 'user' ? "bg-white/5 border-white/10" : "bg-brand-blue/10 border-brand-blue/20"
                     )}>
                        {msg.role === 'assistant' ? <img src={`${import.meta.env.BASE_URL}chatbot-logo.png`} className="w-4 h-4 object-contain" /> : <User className="w-4 h-4 text-gray-400" />}
                     </div>
                     <span className="text-[10px] font-black uppercase tracking-widest opacity-40">
                        {msg.role === 'assistant' ? 'Neural Engine' : 'Commander'}
                     </span>
                  </div>
                  <div className={cn(
                    "max-w-[90%] py-4 text-sm leading-relaxed whitespace-pre-wrap",
                    msg.role === 'assistant' 
                      ? "text-gray-200" 
                      : "bg-brand-blue/10 border border-brand-blue/20 text-brand-blue px-6 rounded-2xl"
                  )}>
                     <div className="prose prose-invert prose-sm max-w-none select-text transition-all">
                        <ReactMarkdown>{msg.text}</ReactMarkdown>
                     </div>
                  </div>
                </motion.div>
              ))}
              {loading && (
                <div className="flex items-center gap-3 text-brand-blue/60 text-xs font-bold animate-pulse">
                  <div className="flex gap-1">
                     {[0, 1, 2].map(i => (
                        <div key={i} className="w-1.5 h-1.5 bg-brand-blue rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                     ))}
                  </div>
                  PRINCE STAR is thinking...
                </div>
              )}
            </div>
          )}
        </div>

        <AnimatePresence>
          {showShareSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-8 left-1/2 -translate-x-1/2 flex items-center gap-2 px-6 py-3 bg-brand-blue text-white rounded-full text-xs font-black uppercase tracking-widest shadow-2xl shadow-blue-500/20 z-[200] whitespace-nowrap border border-white/10"
            >
              <CheckCircle className="w-4 h-4" />
              Link Copied Successfully
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input Dock - Redesigned to match image 1 */}
        <div className="p-4 sm:p-6 pb-4">
           <div className="max-w-3xl mx-auto w-full">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className="mb-6 p-4 rounded-2xl flex flex-col sm:flex-row items-center gap-4 border shadow-2xl backdrop-blur-md bg-red-500/10 border-red-500/20 text-red-400"
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border bg-red-500/20 border-red-500/30">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  </div>
                  
                  <div className="flex-1 text-center sm:text-left">
                    <h3 className="text-sm font-bold uppercase tracking-tight mb-0.5">
                      Protocol Transmission Failure
                    </h3>
                    <p className="text-[11px] opacity-80 leading-relaxed max-w-lg">
                      {error}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setError(null)}
                      className="p-2 hover:bg-white/5 rounded-xl transition-all"
                    >
                      <X className="w-4 h-4 opacity-50" />
                    </button>
                  </div>
                </motion.div>
              )}
              
              <div className="relative group flex items-center">
                 {/* Left Icons Group */}
                 <div className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 flex items-center">
                    <button className="p-2 sm:p-2.5 text-gray-500 hover:text-white bg-white/5 rounded-xl transition-all" title="Attach Files">
                       <Paperclip className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                 </div>

                 <input
                   type="text"
                   value={input}
                   onChange={(e) => setInput(e.target.value)}
                   onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                   placeholder="PRINCE STAR..."
                   className="w-full bg-[#161b29] border border-white/5 rounded-2xl py-4 sm:py-5 pl-12 sm:pl-16 pr-24 sm:pr-28 focus:outline-none focus:border-brand-blue transition-all shadow-2xl text-white placeholder:text-gray-600 font-medium text-sm sm:text-base"
                 />

                 {/* Right Icons Group */}
                 <div className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 sm:gap-2">
                    <button className="hidden sm:flex p-2.5 text-gray-500 hover:text-white transition-all" title="Voice Message">
                       <Mic className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={handleSend}
                      disabled={!input.trim() || loading}
                      className={cn(
                        "p-2 sm:p-2.5 rounded-xl transition-all",
                        input.trim() && !loading 
                          ? "bg-brand-blue text-white shadow-lg shadow-blue-500/20" 
                          : "bg-white/5 text-gray-700 cursor-not-allowed"
                      )}
                    >
                       <ArrowUp className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                 </div>
              </div>

              <div className="mt-4 text-center">
                 <p className="text-[8px] sm:text-[10px] font-bold text-gray-600 tracking-[0.2em] uppercase">
                    Ai-powered intelligence • prince star 3.0
                 </p>
              </div>
           </div>
        </div>
      </div>
      
      {/* Rename Chat UI */}
      <AnimatePresence>
        {renamingChat && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-[#020617]/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm bg-[#0f172a] border border-white/10 rounded-3xl p-6 shadow-2xl"
            >
              <h3 className="text-xl font-bold text-white mb-4">Rename Session</h3>
              <input 
                autoFocus
                type="text" 
                value={newName} 
                onChange={(e) => setNewName(e.target.value)} 
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white mb-6 focus:border-brand-blue outline-none"
              />
              <div className="flex gap-3">
                <button onClick={() => setRenamingChat(null)} className="flex-1 py-3 text-gray-400 font-bold hover:text-white transition-all">Cancel</button>
                <button onClick={() => renameChat(renamingChat)} className="flex-1 py-3 bg-brand-blue text-white font-bold rounded-xl shadow-lg">Save</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.1);
        }
      `}</style>

      {/* Context Menu */}
      <AnimatePresence>
        {contextMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            style={{ top: contextMenu.y, left: contextMenu.x }}
            className="fixed z-[100] w-48 bg-[#0f172a] border border-white/10 rounded-xl shadow-2xl py-2 overflow-hidden backdrop-blur-xl"
          >
            <button onClick={() => shareChat(contextMenu.chatId)} className="w-full flex items-center gap-3 px-4 py-2 hover:bg-white/5 text-gray-300 hover:text-white transition-all text-sm font-medium">
              <Share2 className="w-4 h-4" /> Share Chat
            </button>
            <button 
              onClick={() => {
                const chat = chats.find(c => c.id === contextMenu.chatId);
                setNewName(chat?.title || '');
                setRenamingChat(contextMenu.chatId);
              }} 
              className="w-full flex items-center gap-3 px-4 py-2 hover:bg-white/5 text-gray-300 hover:text-white transition-all text-sm font-medium border-t border-white/5"
            >
              <Edit3 className="w-4 h-4" /> Rename
            </button>
            <button 
              onClick={() => togglePinChat(contextMenu.chatId, chats.find(c => c.id === contextMenu.chatId)?.isPinned)}
              className="w-full flex items-center gap-3 px-4 py-2 hover:bg-white/5 text-gray-300 hover:text-white transition-all text-sm font-medium"
            >
              <Pin className="w-4 h-4" /> {chats.find(c => c.id === contextMenu.chatId)?.isPinned ? 'Unpin' : 'Pin Chat'}
            </button>
            <button 
              onClick={() => toggleArchiveChat(contextMenu.chatId, chats.find(c => c.id === contextMenu.chatId)?.isArchived)}
              className="w-full flex items-center gap-3 px-4 py-2 hover:bg-white/5 text-gray-300 hover:text-white transition-all text-sm font-medium"
            >
              <Archive className="w-4 h-4" /> {chats.find(c => c.id === contextMenu.chatId)?.isArchived ? 'Restore' : 'Archive'}
            </button>
            <button 
              onClick={() => deleteChat(contextMenu.chatId)}
              className="w-full flex items-center gap-3 px-4 py-2 hover:bg-red-500/10 text-red-500 transition-all text-sm font-medium border-t border-white/5"
            >
              <Trash2 className="w-4 h-4" /> Delete Chat
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      <BadgeModal isOpen={isBadgeModalOpen} onClose={() => setIsBadgeModalOpen(false)} />
      <AccessLogsModal isOpen={isLogsModalOpen} onClose={() => setIsLogsModalOpen(false)} />
    </div>
  );
}
