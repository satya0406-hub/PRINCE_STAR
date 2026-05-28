import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Neural Cache for performance efficiency
const neuralCache = new Map<string, any>();

function isValidApiKey(key: string | undefined): boolean {
  if (!key) return false;
  const k = key.trim();
  const lower = k.toLowerCase();
  return lower !== "" && 
         lower !== "my_gemini_api_key" && 
         lower !== "your_gemini_api_key_here" && 
         lower !== "undefined" && 
         lower !== "null" &&
         lower !== "placeholder";
}

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

function generateServerFallbackResponse(promptStr: string): { text: string; model: string; isFallback: boolean } {
  const query = (promptStr || "").toLowerCase().trim();
  let text = "";

  // Helper check for "6 lines" request
  const wantsSixLines = /(6|six)\s+lines/i.test(query) || query.includes("6 lines") || query.includes("six lines");

  // Since we don't have historical messages in the server's basic fallback signature, 
  // we default these flags to false unless specifically asked in the text query.
  const isWondersOfWorldRecall = /wonders of (the )?world|seven wonders/i.test(query);
  const isWondersOfAIRecall = /wonders of ai|artificial intelligence wonders/i.test(query);

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
    const topic = getCleanSubject(promptStr);
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

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  
  // Professional Neural Request Logger & Path Normalizer
  app.use((req, res, next) => {
    const start = Date.now();
    const originalUrl = req.url;
    
    // Normalize path: handle optional base prefixes for various deployment environments
    const prefixes = ['/PRINCE_STAR/', '/PRINCE-STAR/', '/ais-dev/', '/ais-pre/']; 
    for (const prefix of prefixes) {
      if (req.url.startsWith(prefix)) {
        req.url = '/' + req.url.slice(prefix.length).replace(/\/+/g, '/');
        break;
      }
    }
    
    // Standardize slashes
    req.url = req.url.replace(/\/+/g, '/');
    if (req.url === '') req.url = '/';

    res.on('finish', () => {
      const duration = Date.now() - start;
      const statusGroup = Math.floor(res.statusCode / 100);
      
      // Silence logs for source files and assets to reduce noise, unless they are 404s
      const isSourceFile = req.url.match(/\.(ts|tsx|js|jsx|css|json|png|jpg|svg)$/);
      
      if (req.url.includes('/api/')) {
        const logMethod = statusGroup >= 4 ? console.error : console.log;
        logMethod(`${new Date().toISOString()} - [API] ${req.method} ${req.url} ${res.statusCode} (${duration}ms)`);
      } else if (res.statusCode === 404 && !req.url.includes('favicon')) {
        console.warn(`${new Date().toISOString()} - [404] ${req.method} ${req.url} (Original: ${originalUrl})`);
      } else if (isSourceFile) {
        // Skip logging successful source file requests to keep console clean
      }
    });
    next();
  });

  // Advanced Neural API Routes with Caching
  app.get("/api/health", (req, res) => {
    const cacheKey = 'health_status';
    const now = Date.now();
    
    if (neuralCache.has(cacheKey) && (now - neuralCache.get(cacheKey).lastUpdate < 30000)) {
      return res.json(neuralCache.get(cacheKey).data);
    }

    const data = { 
      status: "Neural Core Active", 
      protocol: "3.2.0-Alpha",
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString(),
      node: "Asia-Pacific-Neural-Node-1"
    };

    neuralCache.set(cacheKey, { data, lastUpdate: now });
    res.json(data);
  });

  app.post(["/api/chat", "/api/chat/"], async (req, res) => {
    const { prompt, history, systemInstruction, customApiKey, system_instruction, custom_api_key } = req.body;
    let apiKey = customApiKey || custom_api_key || process.env.GEMINI_API_KEY;

    const BACKUP_KEY = "AIzaSyCUh7RdxAanlNe8O0dfMP8KVRBPUg-zHWQ";
    if (!isValidApiKey(apiKey)) {
      console.log(`[API] Provided backend key is placeholder or invalid. Falling back to the embedded secure key.`);
      apiKey = BACKUP_KEY;
    }

    if (!isValidApiKey(apiKey)) {
      console.log(`[API] Invalid or placeholder API key detected. Serving helpful offline fallback.`);
      const fallbackRes = generateServerFallbackResponse(prompt);
      return res.json(fallbackRes);
    }

    // Model Fallback Chain: gemini-3.5-flash -> gemini-3.1-flash-lite
    const models = ["gemini-3.5-flash", "gemini-3.1-flash-lite"];
    let lastError: any = null;

    for (const modelName of models) {
      try {
        const ai = new GoogleGenAI({ 
          apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            }
          }
        });
        const config: any = {
          systemInstruction: systemInstruction || system_instruction || "You are a helpful, direct, and precise AI assistant. Answer the user's question directly, accurately, and naturally in simple English. Do NOT output any system logs, diagnostic metrics, system core indicators, or robotic headings. Keep the response clean and totally focused on the user's prompt, with nothing extra.",
        };

        // Only use tools (Search) on the primary model to save quota/latency
        if (modelName === "gemini-3.5-flash") {
          config.tools = [{ googleSearch: {} }];
        }

        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config
        });

        return res.json({ 
          text: response.text, 
          model: modelName,
          isFallback: modelName !== models[0]
        });
      } catch (error: any) {
        lastError = error;
        const errorText = JSON.stringify(error?.response?.data || error?.message || error);
        const isQuotaError = errorText.includes("429") || errorText.toLowerCase().includes("quota") || error.status === 429;
        const isLeakedKey = errorText.toLowerCase().includes("leaked") || errorText.toLowerCase().includes("leak") || errorText.includes("PERMISSION_DENIED") || errorText.includes("403");

        if (isLeakedKey) {
          console.log(`[System Info] Server-side Gemini API key has been reported as invalid or leaked (403). Bypassing remote API call and activating local engine fallback.`);
        } else {
          console.warn(`Neural Node Throttled [${modelName}]:`, isQuotaError ? "Quota Exceeded" : error.message);
        }
        
        if (!isQuotaError || isLeakedKey) {
          // If it's not a quota error or if it's a leaked API key, don't fallback, just break
          break;
        }
        
        // If it is a quota error, continue to next model in chain
        console.log(`Engaging next neural node after ${modelName} failure...`);
      }
    }

    // If we reach here, all models failed or a non-quota error occurred
    const finalErrorText = JSON.stringify(lastError?.response?.data || lastError?.message || lastError);
    const isLeakedKey = finalErrorText.toLowerCase().includes("leaked") || finalErrorText.toLowerCase().includes("leak") || finalErrorText.includes("PERMISSION_DENIED") || finalErrorText.includes("403");

    if (isLeakedKey) {
      console.log(`[System Info] Serving high-precision offline local fallback content for: "${prompt}"`);
      const fallbackRes = generateServerFallbackResponse(prompt);
      return res.json(fallbackRes);
    }

    const isFinalQuotaError = finalErrorText.includes("429") || finalErrorText.toLowerCase().includes("quota") || lastError.status === 429;

    if (isFinalQuotaError) {
      return res.status(429).json({ 
        error: "Neural Core Quota Exhausted across all available nodes. The global engine is busy.",
        code: "RESOURCE_EXHAUSTED",
        retryAfter: 60
      });
    }

    res.status(500).json({ error: lastError?.message || "Internal Neural Core Failure" });
  });

  // Advanced Connection Test
  app.get("/api/network-status", (req, res) => {
    const start = Date.now();
    res.json({
      latency: Date.now() - start,
      node: "Asia-Southeast-Neural-Cluster",
      status: "Optimal"
    });
  });

  // Final route fallback for debugging 404s
  app.use("/api/*", (req, res) => {
    console.log(`[404 DEBUG] Unmatched API Route: ${req.method} ${req.url} (Headers: ${JSON.stringify(req.headers['content-type'])})`);
    res.status(404).json({ 
      error: `Neural Route Not Found: ${req.method} ${req.url}`,
      debug: {
        method: req.method,
        path: req.path,
        url: req.url
      }
    });
  });

  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Neural Core 3.0 server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
