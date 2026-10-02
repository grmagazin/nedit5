import { DocumentSettings } from '../types';

export interface DocumentTemplate {
  id: string;
  title: string;
  description: string;
  category: 'PERSONAL' | 'BUSINESS' | 'REPORTS' | 'THEMES' | 'CUSTOM';
  content: string;
  settings?: Partial<DocumentSettings>;
  isCustom?: boolean;
  createdAt?: string;
  thumbnailType?:
    | 'blank'
    | 'proposal'
    | 'resume'
    | 'minutes'
    | 'midnight'
    | 'charcoal'
    | 'obsidian'
    | 'snow'
    | 'sand'
    | 'mint'
    | 'nordic'
    | 'crimson'
    | 'terminal'
    | 'project_status'
    | 'invoice'
    | 'planner'
    | 'standup'
    | 'memo'
    | 'adr'
    | 'postmortem'
    | 'agreement'
    | 'custom';
}

export const STORAGE_KEY_CUSTOM_TEMPLATES = 'wordpad_custom_templates';
export const STORAGE_KEY_CONTENT = 'wordpad_document_content';
export const STORAGE_KEY_SETTINGS = 'wordpad_document_settings';

export const PREMADE_TEMPLATES: DocumentTemplate[] = [
  {
    id: 'blank',
    title: 'Blank Document',
    description: 'Start from scratch with standard formatting.',
    category: 'PERSONAL',
    thumbnailType: 'blank',
    content: '<p></p>',
    settings: {
      title: 'Blank Document',
      pageColor: '#ffffff',
      isDarkMode: false,
      margins: 'normal',
      orientation: 'portrait',
    },
  },
  {
    id: 'executive_proposal',
    title: 'Executive Business Proposal',
    description: 'A structured, high-impact proposal ready for client presentation.',
    category: 'BUSINESS',
    thumbnailType: 'proposal',
    settings: {
      title: 'Strategic Digital Transformation Proposal',
      pageColor: '#ffffff',
      isDarkMode: false,
      margins: 'normal',
      orientation: 'portrait',
    },
    content: `
      <h1 style="color: #0f172a; border-bottom: 2px solid #185abd; padding-bottom: 8px; margin-bottom: 4px;">Strategic Digital Transformation Proposal</h1>
      <p style="color: #64748b; font-size: 13px; margin-top: 0;"><em>Prepared for: Global Enterprise Solutions &bull; Date: October 2025 &bull; Version 2.4</em></p>
      
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
      
      <h2 style="color: #185abd; margin-top: 24px;">1. Executive Summary</h2>
      <p>The objective of this initiative is to modernize enterprise workflow pipelines, accelerate cloud adoption, and integrate AI-assisted automation to drive operational efficiency by <strong>32%</strong> within the first three quarters.</p>
      
      <blockquote>
        <p><strong>Value Statement:</strong> "Engineering agility with friction-free modern collaboration platforms reduces operational overheads and accelerate client satisfaction."</p>
      </blockquote>
      
      <h2 style="color: #185abd; margin-top: 24px;">2. Key Objectives &amp; Deliverables</h2>
      <p>The transformation roadmap focuses on four primary architectural milestones:</p>
      
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <thead>
          <tr style="background-color: #f1f5f9;">
            <th style="border: 1px solid #cbd5e1; padding: 10px; text-align: left; color: #1e293b;">Milestone</th>
            <th style="border: 1px solid #cbd5e1; padding: 10px; text-align: left; color: #1e293b;">Core Deliverable</th>
            <th style="border: 1px solid #cbd5e1; padding: 10px; text-align: left; color: #1e293b;">Timeline</th>
            <th style="border: 1px solid #cbd5e1; padding: 10px; text-align: left; color: #1e293b;">Lead</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="border: 1px solid #cbd5e1; padding: 8px 10px;">Phase 1: Architecture Review</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px 10px;">Cloud audit &amp; security readiness matrix</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px 10px;">Weeks 1&ndash;4</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px 10px;">Solutions Architect</td>
          </tr>
          <tr>
            <td style="border: 1px solid #cbd5e1; padding: 8px 10px;">Phase 2: Core Platform Migration</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px 10px;">Microservices decoupled deployment</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px 10px;">Weeks 5&ndash;12</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px 10px;">DevOps Lead</td>
          </tr>
          <tr>
            <td style="border: 1px solid #cbd5e1; padding: 8px 10px;">Phase 3: Automated Quality CI/CD</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px 10px;">Automated test suites &amp; SLA monitoring</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px 10px;">Weeks 13&ndash;18</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px 10px;">QA Principal</td>
          </tr>
        </tbody>
      </table>
      
      <h2 style="color: #185abd; margin-top: 24px;">3. Project Authorization &amp; Sign-off</h2>
      <p>By executing this proposal, stakeholders approve initiation according to the milestone schedule provided above.</p>
      
      <p style="margin-top: 30px;">
        <strong>Authorized Signatory:</strong> ___________________________ &nbsp;&nbsp;&nbsp;&nbsp; 
        <strong>Date:</strong> ___________________________
      </p>
    `,
  },
  {
    id: 'professional_resume',
    title: 'Modern Professional Resume',
    description: 'Clean, ATS-friendly curriculum vitae template.',
    category: 'PERSONAL',
    thumbnailType: 'resume',
    settings: {
      title: 'Alexander Morgan - Curriculum Vitae',
      author: 'Alexander Morgan',
      pageColor: '#ffffff',
      isDarkMode: false,
      margins: 'narrow',
      orientation: 'portrait',
    },
    content: `
      <div style="text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px;">
        <h1 style="margin: 0; font-size: 26px; letter-spacing: 1.5px; color: #0f172a; text-transform: uppercase;">ALEXANDER MORGAN</h1>
        <p style="margin: 4px 0 0 0; font-size: 14px; font-weight: 600; color: #185abd;">Principal Software Architect &amp; Full-Stack Engineer</p>
        <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b;">
          San Francisco, CA &bull; +1 (555) 019-2834 &bull; alex.morgan@domain.com &bull; linkedin.com/in/alexmorgan
        </p>
      </div>
      
      <h2 style="color: #0f172a; font-size: 15px; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; text-transform: uppercase; margin-top: 18px;">
        Professional Summary
      </h2>
      <p style="font-size: 13px; line-height: 1.5; color: #334155;">
        Results-driven Software Architect with 9+ years of experience engineering high-throughput distributed systems, modern web platforms, and rich real-time collaborative applications. Proven leader in optimizing performance, leading cross-functional teams, and delivering mission-critical enterprise software.
      </p>
      
      <h2 style="color: #0f172a; font-size: 15px; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; text-transform: uppercase; margin-top: 18px;">
        Core Competencies
      </h2>
      <p style="font-size: 13px; color: #334155;">
        <strong>Languages &amp; Runtimes:</strong> TypeScript, JavaScript, Node.js, Go, Python, SQL<br />
        <strong>Frontend Architecture:</strong> React, Next.js, TipTap / ProseMirror, Tailwind CSS, WebSockets<br />
        <strong>Cloud &amp; DevOps:</strong> AWS, Google Cloud Platform, Docker, Kubernetes, Terraform, CI/CD
      </p>
      
      <h2 style="color: #0f172a; font-size: 15px; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; text-transform: uppercase; margin-top: 18px;">
        Work Experience
      </h2>
      <div style="margin-bottom: 14px;">
        <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: bold; color: #0f172a;">
          <span>Principal Architect &mdash; CloudScale Technologies</span>
          <span style="color: #64748b; font-weight: normal;">2022 &ndash; Present</span>
        </div>
        <p style="font-size: 12px; color: #475569; margin: 4px 0 6px 0;">
          Led architecture for an enterprise productivity suite serving over 1.2M active monthly users.
        </p>
        <ul style="margin: 0; padding-left: 20px; font-size: 12px; color: #334155;">
          <li>Designed client-side zero-latency document parsers handling DOCX, HTML/ZIP, and ODF formats.</li>
          <li>Reduced memory footprint by 42% through lazy modular component loading and virtualized rendering.</li>
        </ul>
      </div>
      
      <h2 style="color: #0f172a; font-size: 15px; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; text-transform: uppercase; margin-top: 18px;">
        Education
      </h2>
      <div style="display: flex; justify-content: space-between; font-size: 13px; color: #0f172a;">
        <span><strong>B.S. in Computer Science</strong> &mdash; University of California, Berkeley</span>
        <span style="color: #64748b;">Graduated Magna Cum Laude</span>
      </div>
    `,
  },
  {
    id: 'meeting_minutes',
    title: 'Formal Meeting Minutes',
    description: 'Document discussion topics, attendees, and action items.',
    category: 'REPORTS',
    thumbnailType: 'minutes',
    settings: {
      title: 'Executive Leadership Team — Weekly Sync',
      pageColor: '#ffffff',
      isDarkMode: false,
      margins: 'normal',
      orientation: 'portrait',
    },
    content: `
      <div style="border-bottom: 2px solid #0f766e; padding-bottom: 8px; margin-bottom: 16px;">
        <h1 style="color: #0f766e; margin: 0; font-size: 22px;">Executive Leadership Team &mdash; Weekly Sync</h1>
        <p style="color: #64748b; font-size: 12px; margin-top: 4px;">
          <strong>Date:</strong> October 24, 2025 &bull; <strong>Time:</strong> 10:00 AM &ndash; 11:30 AM &bull; <strong>Location:</strong> Boardroom A / Remote
        </p>
      </div>
      
      <h2 style="color: #0f766e; font-size: 14px; text-transform: uppercase;">Attendees</h2>
      <p style="font-size: 13px;">
        <strong>Present:</strong> Sarah Jenkins (CEO), David Chen (CTO), Maya Patel (VP Product), Marcus Brody (CFO)<br />
        <strong>Apologies:</strong> Elena Rostova (VP Marketing)
      </p>
      
      <h2 style="color: #0f766e; font-size: 14px; text-transform: uppercase; margin-top: 20px;">Agenda Overview</h2>
      <ol style="font-size: 13px; line-height: 1.6; color: #334155;">
        <li><strong>Q3 Financial Performance Review:</strong> Analysis of recurring revenue growth and gross margins.</li>
        <li><strong>Product v3.0 Release Roadmap:</strong> Verification of key document engines and export pipelines.</li>
        <li><strong>Operations &amp; Security Compliance:</strong> Annual SOC2 audit progress and infrastructure hardening.</li>
      </ol>
      
      <h2 style="color: #0f766e; font-size: 14px; text-transform: uppercase; margin-top: 20px;">Key Discussion Points &amp; Decisions</h2>
      <ul style="font-size: 13px; line-height: 1.6; color: #334155;">
        <li><strong>Unanimous Approval:</strong> The committee approved the Q4 expansion budget for high-speed document engines.</li>
        <li><strong>Format Compliance:</strong> Confirmed full support for ISO/IEC 26300 ODF standard alongside Microsoft DOCX.</li>
      </ul>
      
      <h2 style="color: #0f766e; font-size: 14px; text-transform: uppercase; margin-top: 20px;">Action Items Checklist</h2>
      <ul data-type="taskList">
        <li data-type="taskItem" data-checked="true"><label><input type="checkbox" checked="checked"><span></span></label><div><p>Circulate finalized Q3 financial statements &mdash; <em>Marcus Brody</em></p></div></li>
        <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Complete end-to-end integration test of local template storage &mdash; <em>David Chen</em></p></div></li>
        <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Schedule executive preview with key institutional enterprise customers &mdash; <em>Maya Patel</em></p></div></li>
      </ul>
      
      <p style="font-size: 12px; color: #64748b; margin-top: 28px;">
        <strong>Next Meeting:</strong> Friday, October 31, 2025 at 10:00 AM.
      </p>
    `,
  },
  {
    id: 'midnight_brief',
    title: 'Midnight Brief',
    description: 'Sleek executive layout with electric-blue accents for bold, modern communication.',
    category: 'THEMES',
    thumbnailType: 'midnight',
    settings: {
      title: 'Midnight Brief',
      margins: 'normal',
      orientation: 'portrait',
    },
    content: `
      <div style="border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 20px;">
        <h1 style="color: #0284c7; margin: 0; font-size: 26px; letter-spacing: 0.5px;">Midnight Brief</h1>
        <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0;">A sleek, modern brief for bold communication. Ideal for product launches and design-forward proposals.</p>
      </div>
      
      <h2 style="color: #0284c7; font-size: 16px; margin-top: 24px;">Overview</h2>
      <p style="font-size: 14px; line-height: 1.6;">
        Present your ideas with clean visual contrast that makes key insights and imagery pop with modern clarity.
      </p>
      
      <h2 style="color: #0284c7; font-size: 16px; margin-top: 24px;">Highlights</h2>
      <ul style="font-size: 13px; line-height: 1.7;">
        <li><strong>High-clarity layout:</strong> Harmonizes automatically across light, dark, and print themes.</li>
        <li><strong>Electric-blue accents:</strong> Focuses the reader's eye on key insights and section demarcations.</li>
        <li><strong>Polished formatting:</strong> Clean typography tuned for readability across mobile and desktop viewports.</li>
      </ul>
      
      <blockquote style="border-left: 4px solid #0284c7; padding: 10px 14px; margin-top: 24px;">
        <p style="font-size: 13px; margin: 0; font-weight: 500;">
          &ldquo;Simplicity is the ultimate sophistication. When design recedes, high-conviction ideas shine.&rdquo;
        </p>
      </blockquote>
    `,
  },
  {
    id: 'charcoal_notes',
    title: 'Charcoal Notes',
    description: 'Refined purple-accented layout for creative briefs and editorial content.',
    category: 'THEMES',
    thumbnailType: 'charcoal',
    settings: {
      title: 'Charcoal Notes',
      margins: 'normal',
      orientation: 'portrait',
    },
    content: `
      <div style="border-bottom: 2px solid #9333ea; padding-bottom: 12px; margin-bottom: 20px;">
        <h1 style="color: #9333ea; margin: 0; font-size: 26px;">Charcoal Notes</h1>
        <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0;">A refined purple-accented layout for creative briefs and editorial content.</p>
      </div>
      
      <h2 style="color: #9333ea; font-size: 16px; margin-top: 24px;">Concept</h2>
      <p style="font-size: 14px; line-height: 1.6;">
        Soft purple accents set a sophisticated, focused tone suitable for design guidelines, storyboards, and creative treatments.
      </p>
      
      <ul style="font-size: 13px; line-height: 1.7; margin-top: 14px;">
        <li>Elegant purple accents</li>
        <li>Editorial spacing</li>
        <li>Universal light and dark compatibility</li>
      </ul>
      
      <blockquote style="border-left: 4px solid #9333ea; padding: 10px 14px; margin-top: 24px;">
        <p style="font-size: 13px; margin: 0;">
          <strong>Editorial Note:</strong> Designed to maintain visual poise while reducing digital eye fatigue during intensive writing sprints.
        </p>
      </blockquote>
    `,
  },
  {
    id: 'obsidian_report',
    title: 'Obsidian Report',
    description: 'Premium theme with warm amber accents for executive summaries and highlights.',
    category: 'THEMES',
    thumbnailType: 'obsidian',
    settings: {
      title: 'Obsidian Report',
      margins: 'normal',
      orientation: 'portrait',
    },
    content: `
      <div style="border-bottom: 2px solid #d97706; padding-bottom: 12px; margin-bottom: 20px;">
        <h1 style="color: #d97706; margin: 0; font-size: 26px;">Obsidian Report</h1>
        <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0;">A premium theme with warm amber accents for executive summaries and data highlights.</p>
      </div>
      
      <h2 style="color: #d97706; font-size: 16px; margin-top: 24px;">Key Points</h2>
      <p style="font-size: 14px; line-height: 1.6;">
        Warm amber accents guide the eye across a balanced canvas built for impact and executive prestige.
      </p>
      
      <ul style="font-size: 13px; line-height: 1.7; margin-top: 14px;">
        <li>Warm amber highlights</li>
        <li>Executive layout</li>
        <li>High readability across all color modes</li>
      </ul>
    `,
  },
  {
    id: 'snow_whitepaper',
    title: 'Snow Whitepaper',
    description: 'Crisp, clean light theme with confident blue accents for whitepapers.',
    category: 'THEMES',
    thumbnailType: 'snow',
    settings: {
      title: 'Snow Whitepaper',
      pageColor: '#ffffff',
      isDarkMode: false,
      margins: 'normal',
      orientation: 'portrait',
    },
    content: `
      <div style="border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 20px;">
        <h1 style="color: #2563eb; margin: 0; font-size: 26px;">Snow Whitepaper</h1>
        <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0;">A crisp, clean light theme with confident blue accents &mdash; perfect for whitepapers and formal reports.</p>
      </div>
      
      <h2 style="color: #2563eb; font-size: 16px; margin-top: 24px;">Summary</h2>
      <p style="color: #334155; font-size: 14px; line-height: 1.6;">
        Maximize clarity with generous whitespace and a classic blue heading palette.
      </p>
      
      <ul style="color: #334155; font-size: 13px; line-height: 1.7; margin-top: 14px;">
        <li>Pure white surface</li>
        <li>Classic blue accents</li>
        <li>Print-ready contrast</li>
      </ul>
    `,
  },
  {
    id: 'sand_journal',
    title: 'Sand Journal',
    description: 'Warm, paper-inspired theme with amber-brown accents for journals.',
    category: 'THEMES',
    thumbnailType: 'sand',
    settings: {
      title: 'Sand Journal',
      margins: 'normal',
      orientation: 'portrait',
    },
    content: `
      <div style="border-bottom: 2px solid #b45309; padding-bottom: 12px; margin-bottom: 20px;">
        <h1 style="color: #b45309; margin: 0; font-size: 26px;">Sand Journal</h1>
        <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0;">A warm, paper-inspired theme with amber-brown accents for journals and long-form writing.</p>
      </div>
      
      <h2 style="color: #b45309; font-size: 16px; margin-top: 24px;">Reflections</h2>
      <p style="font-size: 14px; line-height: 1.6;">
        Comfortable formatting reduces eye strain during extended reading and reflective journaling sessions.
      </p>
      
      <ul style="font-size: 13px; line-height: 1.7; margin-top: 14px;">
        <li>Clean reading surface</li>
        <li>Earthy amber accents</li>
        <li>Distraction-free layout</li>
      </ul>
    `,
  },
  {
    id: 'mint_memo',
    title: 'Mint Memo',
    description: 'Fresh emerald and mint-accented layout for clean internal updates.',
    category: 'THEMES',
    thumbnailType: 'mint',
    settings: {
      title: 'Mint Memo',
      margins: 'normal',
      orientation: 'portrait',
    },
    content: `
      <div style="border-bottom: 2px solid #059669; padding-bottom: 12px; margin-bottom: 20px;">
        <h1 style="color: #059669; margin: 0; font-size: 26px;">Mint Memo</h1>
        <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0;">Fresh emerald and mint-accented layout for team updates and clean internal broadcasts.</p>
      </div>
      
      <h2 style="color: #059669; font-size: 16px; margin-top: 24px;">Announcement</h2>
      <p style="font-size: 14px; line-height: 1.6;">
        Keep team communications vibrant, organized, and delightful to read with subtle green header accents.
      </p>
      
      <ul style="font-size: 13px; line-height: 1.7; margin-top: 14px;">
        <li>Fresh mint accents</li>
        <li>Clean action items</li>
        <li>Rapid scannability</li>
      </ul>
    `,
  },
  {
    id: 'nordic_spec',
    title: 'Nordic Slate Spec',
    description: 'Clean Scandinavian light-slate theme for engineering notes and specs.',
    category: 'THEMES',
    thumbnailType: 'nordic',
    settings: {
      title: 'Nordic Slate Technical Spec',
      margins: 'normal',
      orientation: 'portrait',
    },
    content: `
      <div style="border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 20px;">
        <h1 style="color: #0284c7; margin: 0; font-size: 24px; letter-spacing: -0.5px;">Nordic Slate Technical Specification</h1>
        <p style="color: #64748b; font-size: 12px; margin: 4px 0 0 0;">Minimalist cool-slate engineering layout &bull; Version 1.2.0 &bull; Architecture Spec</p>
      </div>
      
      <h2 style="color: #0369a1; font-size: 15px; margin-top: 20px;">System Architecture Overview</h2>
      <p style="font-size: 13px; line-height: 1.6;">
        Designed with Scandinavian clarity: generous whitespace, high-contrast ice-blue anchors, and structured specifications.
      </p>

      <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 12px;">
        <thead>
          <tr style="background-color: #f1f5f9;">
            <th style="border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; color: #0369a1;">Layer</th>
            <th style="border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; color: #0369a1;">Technology</th>
            <th style="border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; color: #0369a1;">SLA Target</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="border: 1px solid #cbd5e1; padding: 6px 10px;">Client Runtime</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px 10px;">React 19 + TipTap Core</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px 10px;">&lt; 16ms frame budget</td>
          </tr>
          <tr>
            <td style="border: 1px solid #cbd5e1; padding: 6px 10px;">Format Pipeline</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px 10px;">Client-Side OpenXML &amp; ODF</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px 10px;">Zero server latency</td>
          </tr>
        </tbody>
      </table>

      <blockquote style="border-left: 3px solid #0284c7; padding: 10px 14px; margin-top: 18px;">
        <p style="font-size: 12px; margin: 0;">
          <strong>Pro-tip:</strong> Use this theme for API documentation, architectural decision records (ADRs), and technical briefs.
        </p>
      </blockquote>
    `,
  },
  {
    id: 'crimson_editorial',
    title: 'Crimson Press Release',
    description: 'Modern editorial blush and wine-red palette for press updates and articles.',
    category: 'THEMES',
    thumbnailType: 'crimson',
    settings: {
      title: 'Crimson Press Release',
      margins: 'normal',
      orientation: 'portrait',
    },
    content: `
      <div style="border-bottom: 2px solid #be123c; padding-bottom: 12px; margin-bottom: 20px;">
        <p style="color: #be123c; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; margin: 0;">FOR IMMEDIATE RELEASE</p>
        <h1 style="color: #be123c; margin: 4px 0 0 0; font-size: 24px; line-height: 1.25;">Next-Generation Document Suite Launches Universal Multi-Format Architecture</h1>
        <p style="color: #64748b; font-size: 12px; margin: 6px 0 0 0;"><em>SAN FRANCISCO, CA &bull; October 2025 &bull; Press Release Desk</em></p>
      </div>

      <p style="font-size: 13px; line-height: 1.65;">
        Today marks the public availability of an all-new browser-native document workstation capable of reading, exporting, and roundtripping standard Microsoft Word (.docx), OpenDocument (.odt), and ISO vector PDF files without requiring cloud servers.
      </p>

      <blockquote style="border-left: 4px solid #be123c; padding-left: 14px; margin: 18px 0; font-style: italic;">
        <p style="margin: 0; font-size: 13px;">"By processing documents 100% locally in the browser, users get instantaneous turnaround times, complete privacy, and zero file-size upload friction."</p>
      </blockquote>

      <h2 style="color: #be123c; font-size: 14px; text-transform: uppercase; margin-top: 20px;">Media Contacts</h2>
      <p style="font-size: 12px; line-height: 1.5;">
        Press Relations Team &bull; press@wordpad.app &bull; +1 (555) 018-9922<br />
        Media Kit &amp; Brand Assets: https://wordpad.app/press
      </p>
    `,
  },
  {
    id: 'terminal_matrix',
    title: 'Terminal Matrix',
    description: 'Developer changelog theme with emerald highlights and clean code blocks.',
    category: 'THEMES',
    thumbnailType: 'terminal',
    settings: {
      title: 'Terminal Matrix Changelog',
      margins: 'normal',
      orientation: 'portrait',
    },
    content: `
      <div style="border-bottom: 2px solid #10b981; padding-bottom: 12px; margin-bottom: 20px;">
        <h1 style="color: #10b981; margin: 0; font-size: 22px; font-family: monospace;">$ ./deploy-v3.0.0 --release-notes</h1>
        <p style="color: #64748b; font-size: 11px; font-family: monospace; margin: 4px 0 0 0;">BUILD: 2025-10-30T08:00:00Z &bull; STABILITY: PASS &bull; COVERAGE: 99.4%</p>
      </div>

      <h2 style="color: #10b981; font-size: 14px; font-family: monospace; margin-top: 20px;">[+] What's New in v3.0</h2>
      <ul style="font-size: 12px; font-family: monospace; line-height: 1.7;">
        <li><strong style="color: #10b981;">feat(core):</strong> Client-side ZIP package extraction and streaming generation.</li>
        <li><strong style="color: #10b981;">feat(ui):</strong> Safe lazy loading on all Backstage panels for zero startup delay.</li>
        <li><strong style="color: #10b981;">perf(print):</strong> ISO 32000 print workstation with dynamic stylesheet injection.</li>
      </ul>

      <pre style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px; font-size: 11px; font-family: monospace; overflow-x: auto; margin-top: 16px;"><code>curl -X POST https://api.workspace.internal/v1/inspect \\
  -H "Content-Type: application/json" \\
  -d '{"engine": "docx", "features": ["tables", "styles", "images"]}'</code></pre>
    `,
  },
  {
    id: 'project_status_brief',
    title: 'Project Status One-Pager',
    description: 'Executive weekly milestone summary with KPI boxes, blockers, and next steps.',
    category: 'REPORTS',
    thumbnailType: 'project_status',
    settings: {
      title: 'Project Alpha — Weekly Executive Status Brief',
      pageColor: '#ffffff',
      isDarkMode: false,
      margins: 'normal',
      orientation: 'portrait',
    },
    content: `
      <div style="border-bottom: 2px solid #1e3a8a; padding-bottom: 10px; margin-bottom: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: baseline;">
          <h1 style="color: #1e3a8a; margin: 0; font-size: 22px;">Project Alpha &mdash; Weekly Executive Status</h1>
          <span style="background-color: #dbeafe; color: #1e40af; font-size: 10px; font-weight: bold; padding: 2px 8px; rounded: 4px;">STATUS: ON TRACK (GREEN)</span>
        </div>
        <p style="color: #64748b; font-size: 12px; margin: 4px 0 0 0;">Project Lead: Engineering Director &bull; Sprint 14 &bull; Period: Week of Oct 27, 2025</p>
      </div>

      <!-- 3 KPI Metric Cards -->
      <table style="width: 100%; border-collapse: separate; border-spacing: 8px 0; margin: 14px -8px;">
        <tr>
          <td style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; text-align: center; width: 33%;">
            <div style="font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: bold;">Milestone Progress</div>
            <div style="font-size: 22px; font-weight: bold; color: #1e3a8a; margin-top: 2px;">94%</div>
            <div style="font-size: 10px; color: #059669;">+6% from last sprint</div>
          </td>
          <td style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; text-align: center; width: 33%;">
            <div style="font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: bold;">Budget Burn Rate</div>
            <div style="font-size: 22px; font-weight: bold; color: #0284c7; margin-top: 2px;">82%</div>
            <div style="font-size: 10px; color: #0284c7;">On schedule (SLA 85%)</div>
          </td>
          <td style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; text-align: center; width: 33%;">
            <div style="font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: bold;">Team Velocity</div>
            <div style="font-size: 22px; font-weight: bold; color: #059669; margin-top: 2px;">48 pts</div>
            <div style="font-size: 10px; color: #059669;">+4 pts above baseline</div>
          </td>
        </tr>
      </table>

      <h2 style="color: #1e3a8a; font-size: 13px; text-transform: uppercase; margin-top: 18px;">Key Accomplishments This Week</h2>
      <ul style="color: #334155; font-size: 12px; line-height: 1.6;">
        <li>Finalized zero-latency smart document template catalog.</li>
        <li>Implemented safe lazy loading across all backstage tabs with instant fallback.</li>
        <li>Completed test coverage for document print geometry and margin preservation.</li>
      </ul>

      <h2 style="color: #1e3a8a; font-size: 13px; text-transform: uppercase; margin-top: 16px;">Blockers &amp; Risk Mitigation</h2>
      <p style="color: #475569; font-size: 12px; line-height: 1.5;">
        <strong>None currently critical.</strong> Performance telemetry demonstrates consistent sub-20ms rendering times across all supported viewports.
      </p>
    `,
  },
  {
    id: 'smart_invoice',
    title: 'Modern Service Invoice',
    description: 'Clear, professional itemized billing statement with payment instructions.',
    category: 'BUSINESS',
    thumbnailType: 'invoice',
    settings: {
      title: 'Invoice #INV-2025-084',
      pageColor: '#ffffff',
      isDarkMode: false,
      margins: 'normal',
      orientation: 'portrait',
    },
    content: `
      <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 14px; margin-bottom: 20px;">
        <div>
          <h1 style="color: #0f172a; margin: 0; font-size: 24px; text-transform: uppercase; letter-spacing: 1px;">INVOICE</h1>
          <p style="color: #64748b; font-size: 11px; margin: 4px 0 0 0;">Invoice #: <strong>INV-2025-084</strong> &bull; Date: Oct 30, 2025</p>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 14px; font-weight: bold; color: #185abd;">Apex Digital Studio</div>
          <div style="font-size: 11px; color: #64748b;">billing@apexdigital.com &bull; +1 (555) 019-3388</div>
        </div>
      </div>

      <div style="margin-bottom: 20px; font-size: 12px; color: #334155;">
        <strong>Billed To:</strong> Acme Corporation &bull; Attn: Accounts Payable &bull; 100 Market St, San Francisco, CA
      </div>

      <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 12px;">
        <thead>
          <tr style="background-color: #f1f5f9; color: #0f172a;">
            <th style="border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left;">Item Description</th>
            <th style="border: 1px solid #cbd5e1; padding: 8px 10px; text-align: right; width: 60px;">Hours</th>
            <th style="border: 1px solid #cbd5e1; padding: 8px 10px; text-align: right; width: 80px;">Rate</th>
            <th style="border: 1px solid #cbd5e1; padding: 8px 10px; text-align: right; width: 90px;">Total</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="border: 1px solid #cbd5e1; padding: 8px 10px;">Executive Software Engineering &amp; UI Optimization</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px 10px; text-align: right;">32</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px 10px; text-align: right;">$150.00</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px 10px; text-align: right;">$4,800.00</td>
          </tr>
          <tr>
            <td style="border: 1px solid #cbd5e1; padding: 8px 10px;">Multi-Format Export Engine Testing &amp; Verification</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px 10px; text-align: right;">16</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px 10px; text-align: right;">$150.00</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px 10px; text-align: right;">$2,400.00</td>
          </tr>
          <tr style="font-weight: bold; background-color: #f8fafc;">
            <td colspan="3" style="border: 1px solid #cbd5e1; padding: 8px 10px; text-align: right;">Total Balance Due:</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px 10px; text-align: right; color: #185abd;">$7,200.00</td>
          </tr>
        </tbody>
      </table>

      <p style="font-size: 11px; color: #64748b; margin-top: 24px;">
        <strong>Payment Terms:</strong> Net 30 days &bull; Bank Wire: First National &bull; Account: 9823-441-29
      </p>
    `,
  },
  {
    id: 'weekly_focus_matrix',
    title: 'Weekly Focus & Habit Matrix',
    description: 'High-productivity planner with priority checklist and daily focus blocks.',
    category: 'PERSONAL',
    thumbnailType: 'planner',
    settings: {
      title: 'Weekly Focus & Habit Matrix',
      margins: 'normal',
      orientation: 'portrait',
    },
    content: `
      <div style="border-bottom: 2px solid #7c3aed; padding-bottom: 10px; margin-bottom: 16px;">
        <h1 style="color: #7c3aed; margin: 0; font-size: 22px;">Weekly Focus &amp; Habit Matrix</h1>
        <p style="color: #64748b; font-size: 12px; margin: 4px 0 0 0;">Intentional Sprint Planning &bull; Week of October 27, 2025</p>
      </div>

      <h2 style="color: #7c3aed; font-size: 14px; text-transform: uppercase;">Top 3 Weekly Outcomes</h2>
      <ul data-type="taskList">
        <li data-type="taskItem" data-checked="true"><label><input type="checkbox" checked="checked"><span></span></label><div><p>Deliver production-ready modular backstage components.</p></div></li>
        <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Complete documentation review with technical team.</p></div></li>
        <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Reflect on weekly output and optimize morning deep-work blocks.</p></div></li>
      </ul>

      <h2 style="color: #7c3aed; font-size: 14px; text-transform: uppercase; margin-top: 20px;">Daily Deep Work Schedule</h2>
      <table style="width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 12px;">
        <thead>
          <tr style="background-color: #f1f5f9;">
            <th style="border: 1px solid #cbd5e1; padding: 6px 10px; text-align: left; color: #7c3aed;">Day</th>
            <th style="border: 1px solid #cbd5e1; padding: 6px 10px; text-align: left; color: #7c3aed;">Morning Deep Focus (9am - 12pm)</th>
            <th style="border: 1px solid #cbd5e1; padding: 6px 10px; text-align: left; color: #7c3aed;">Afternoon Execution</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="border: 1px solid #cbd5e1; padding: 6px 10px; font-weight: bold;">Monday</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px 10px;">Sprint architecture alignment</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px 10px;">Core engine coding</td>
          </tr>
          <tr>
            <td style="border: 1px solid #cbd5e1; padding: 6px 10px; font-weight: bold;">Wednesday</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px 10px;">Unit test verification &amp; linting</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px 10px;">Peer review session</td>
          </tr>
          <tr>
            <td style="border: 1px solid #cbd5e1; padding: 6px 10px; font-weight: bold;">Friday</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px 10px;">Weekly retrospective &amp; demo</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px 10px;">Clean backlog &amp; sign-off</td>
          </tr>
        </tbody>
      </table>
    `,
  },
  {
    id: 'standup_sync',
    title: 'Weekly Standup & 1-on-1 Sync',
    description: 'High-value sync agenda with accomplishments, blockers, and weekly goals.',
    category: 'BUSINESS',
    thumbnailType: 'standup',
    settings: {
      title: 'Weekly Standup & 1-on-1 Sync Agenda',
      margins: 'normal',
      orientation: 'portrait',
    },
    content: `
      <div style="border-bottom: 2px solid #0284c7; padding-bottom: 10px; margin-bottom: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: baseline;">
          <h1 style="color: #0284c7; margin: 0; font-size: 22px;">Weekly Sync &amp; Standup Brief</h1>
          <span style="background-color: #e0f2fe; color: #0369a1; font-size: 10px; font-weight: bold; padding: 2px 8px; border-radius: 4px;">WEEKLY CADENCE</span>
        </div>
        <p style="color: #64748b; font-size: 12px; margin: 4px 0 0 0;">Facilitator: Team Lead &bull; Attendees: Core Engineering &bull; 30 Minutes</p>
      </div>

      <h2 style="color: #0369a1; font-size: 13px; text-transform: uppercase;">1. Key Accomplishments (Past Week)</h2>
      <ul data-type="taskList">
        <li data-type="taskItem" data-checked="true"><label><input type="checkbox" checked="checked"><span></span></label><div><p>Shipped universal dark and light mode compatibility across all document templates.</p></div></li>
        <li data-type="taskItem" data-checked="true"><label><input type="checkbox" checked="checked"><span></span></label><div><p>Verified client-side OpenXML DOCX and ODF export roundtrip fidelity.</p></div></li>
        <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Profiled client memory during multi-megabyte image document editing.</p></div></li>
      </ul>

      <h2 style="color: #0369a1; font-size: 13px; text-transform: uppercase; margin-top: 18px;">2. Top Focus &amp; Commitments (This Week)</h2>
      <ol style="color: #334155; font-size: 12px; line-height: 1.6;">
        <li><strong>Performance:</strong> Maintain sub-16ms interactive typing responsiveness.</li>
        <li><strong>Reliability:</strong> Complete end-to-end unit test suite for print page break styles.</li>
        <li><strong>Collaboration:</strong> Finalize quarterly customer release notes.</li>
      </ol>

      <h2 style="color: #0369a1; font-size: 13px; text-transform: uppercase; margin-top: 18px;">3. Blockers &amp; Questions for Discussion</h2>
      <div style="background-color: #f8fafc; border-left: 3px solid #0284c7; padding: 10px 14px; border-radius: 4px; font-size: 12px; color: #334155;">
        <p style="margin: 0;"><strong>Need input:</strong> Confirm standard margins (1-inch vs 0.5-inch) for auto-generated PDF exports.</p>
      </div>
    `,
  },
  {
    id: 'executive_memo',
    title: 'Executive Formal Memorandum',
    description: 'Classic formal corporate memorandum with date, to/from, and directives.',
    category: 'BUSINESS',
    thumbnailType: 'memo',
    settings: {
      title: 'Memorandum — Architecture & Operations Policy',
      margins: 'normal',
      orientation: 'portrait',
    },
    content: `
      <div style="border-bottom: 2px solid #0f172a; padding-bottom: 14px; margin-bottom: 20px;">
        <h1 style="color: #0f172a; margin: 0; font-size: 24px; text-transform: uppercase; letter-spacing: 1.5px;">MEMORANDUM</h1>
        <p style="color: #64748b; font-size: 11px; margin: 4px 0 0 0;">CONFIDENTIAL &bull; FOR INTERNAL DISTRIBUTION ONLY</p>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px;">
        <tbody>
          <tr>
            <td style="padding: 4px 0; width: 80px; font-weight: bold; color: #0f172a;">TO:</td>
            <td style="padding: 4px 0; color: #334155;">All Department Leads &amp; Engineering Teams</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; font-weight: bold; color: #0f172a;">FROM:</td>
            <td style="padding: 4px 0; color: #334155;">Office of the Chief Technology Officer</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; font-weight: bold; color: #0f172a;">DATE:</td>
            <td style="padding: 4px 0; color: #334155;">October 30, 2025</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; font-weight: bold; color: #0f172a;">SUBJECT:</td>
            <td style="padding: 4px 0; font-weight: bold; color: #185abd;">Adoption of Zero-Latency Client-Side Document Architecture</td>
          </tr>
        </tbody>
      </table>

      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 16px 0;" />

      <h2 style="color: #0f172a; font-size: 14px; margin-top: 16px;">1. Purpose</h2>
      <p style="color: #334155; font-size: 12.5px; line-height: 1.6;">
        This memorandum establishes mandatory architectural guidelines prioritizing client-side data isolation, zero-latency document transformations, and local persistence for all internal tooling.
      </p>

      <h2 style="color: #0f172a; font-size: 14px; margin-top: 16px;">2. Core Directives</h2>
      <ul style="color: #334155; font-size: 12.5px; line-height: 1.6;">
        <li>All document parsers must operate completely client-side in the user's browser sandbox.</li>
        <li>No unencrypted plain text or sensitive customer documents may be transmitted to external servers.</li>
        <li>Theme transitions (light, canvas dark, full dark, sepia) must be supported without page reloads.</li>
      </ul>

      <p style="color: #475569; font-size: 12px; margin-top: 24px;">
        Signed,<br />
        <strong>David Chen</strong><br />
        Chief Technology Officer
      </p>
    `,
  },
  {
    id: 'tech_adr',
    title: 'Architecture Decision Record (ADR)',
    description: 'Structured engineering design record with context, options, and decision.',
    category: 'REPORTS',
    thumbnailType: 'adr',
    settings: {
      title: 'ADR-014: Modular Lazy-Loaded Document Engine',
      margins: 'normal',
      orientation: 'portrait',
    },
    content: `
      <div style="border-bottom: 2px solid #6366f1; padding-bottom: 12px; margin-bottom: 18px;">
        <div style="display: flex; justify-content: space-between; align-items: baseline;">
          <h1 style="color: #4338ca; margin: 0; font-size: 22px;">ADR-014: Modular Lazy-Loaded Document Engines</h1>
          <span style="background-color: #e0e7ff; color: #3730a3; font-size: 10px; font-weight: bold; padding: 2px 8px; border-radius: 4px;">STATUS: ACCEPTED</span>
        </div>
        <p style="color: #64748b; font-size: 11px; margin: 4px 0 0 0;">Deciders: Architecture Committee &bull; Date: October 2025 &bull; Scope: Web Workstation</p>
      </div>

      <h2 style="color: #4338ca; font-size: 13px; text-transform: uppercase;">1. Context &amp; Problem Statement</h2>
      <p style="color: #334155; font-size: 12px; line-height: 1.6;">
        Bundling all export engines (DOCX, ODF, PDF, Markdown, JSON Backup, HTML+ZIP) into the initial JavaScript payload increased bundle size and delayed Time to Interactive (TTI). We needed code-splitting without sacrificing offline reliability.
      </p>

      <h2 style="color: #4338ca; font-size: 13px; text-transform: uppercase; margin-top: 16px;">2. Considered Alternatives</h2>
      <table style="width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 11.5px;">
        <thead>
          <tr style="background-color: #f5f3ff;">
            <th style="border: 1px solid #ddd6fe; padding: 6px 10px; text-align: left; color: #4338ca;">Option</th>
            <th style="border: 1px solid #ddd6fe; padding: 6px 10px; text-align: left; color: #4338ca;">Pros</th>
            <th style="border: 1px solid #ddd6fe; padding: 6px 10px; text-align: left; color: #4338ca;">Cons</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="border: 1px solid #ddd6fe; padding: 6px 10px; font-weight: bold;">A: Monolithic Bundle</td>
            <td style="border: 1px solid #ddd6fe; padding: 6px 10px;">Immediate tab switching</td>
            <td style="border: 1px solid #ddd6fe; padding: 6px 10px;">High initial load penalty</td>
          </tr>
          <tr>
            <td style="border: 1px solid #ddd6fe; padding: 6px 10px; font-weight: bold;">B: React.lazy + Suspense</td>
            <td style="border: 1px solid #ddd6fe; padding: 6px 10px;">Minimal entry bundle, chunk caching</td>
            <td style="border: 1px solid #ddd6fe; padding: 6px 10px;">Requires fallback indicators</td>
          </tr>
        </tbody>
      </table>

      <h2 style="color: #4338ca; font-size: 13px; text-transform: uppercase; margin-top: 16px;">3. Decision Outcome</h2>
      <p style="color: #334155; font-size: 12px; line-height: 1.6;">
        Adopted <strong>Option B</strong>. All backstage format modules are split into standalone chunks with animated fallbacks, reducing entry bundle by 58% while maintaining instantaneous client switching.
      </p>
    `,
  },
  {
    id: 'incident_postmortem',
    title: 'Incident Post-Mortem & RCA',
    description: 'Blameless post-incident review with timeline, root cause, and mitigations.',
    category: 'REPORTS',
    thumbnailType: 'postmortem',
    settings: {
      title: 'Incident Post-Mortem: INC-402',
      margins: 'normal',
      orientation: 'portrait',
    },
    content: `
      <div style="border-bottom: 2px solid #dc2626; padding-bottom: 12px; margin-bottom: 18px;">
        <div style="display: flex; justify-content: space-between; align-items: baseline;">
          <h1 style="color: #b91c1c; margin: 0; font-size: 22px;">Incident Post-Mortem: INC-402</h1>
          <span style="background-color: #fee2e2; color: #991b1b; font-size: 10px; font-weight: bold; padding: 2px 8px; border-radius: 4px;">SEV-2 RESOLVED</span>
        </div>
        <p style="color: #64748b; font-size: 11px; margin: 4px 0 0 0;">Incident Date: Oct 28, 2025 &bull; Lead Investigator: SRE On-Call &bull; Status: Closed</p>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 12px;">
        <tr>
          <td style="padding: 4px 8px; background-color: #fef2f2; border: 1px solid #fecaca; width: 25%; font-weight: bold;">Duration:</td>
          <td style="padding: 4px 8px; border: 1px solid #fecaca; width: 25%;">42 minutes</td>
          <td style="padding: 4px 8px; background-color: #fef2f2; border: 1px solid #fecaca; width: 25%; font-weight: bold;">User Impact:</td>
          <td style="padding: 4px 8px; border: 1px solid #fecaca; width: 25%;">3.1% error rate</td>
        </tr>
      </table>

      <h2 style="color: #b91c1c; font-size: 13px; text-transform: uppercase;">1. Executive Summary</h2>
      <p style="color: #334155; font-size: 12px; line-height: 1.6;">
        Between 14:10 and 14:52 UTC, users experienced intermittent timeouts during large document exports due to browser main-thread contention. Automated failover and virtualized pagination resolved the spike.
      </p>

      <h2 style="color: #b91c1c; font-size: 13px; text-transform: uppercase; margin-top: 16px;">2. Root Cause Analysis (5 Whys)</h2>
      <p style="color: #334155; font-size: 12px; line-height: 1.6;">
        Heavy inline base64 image data strings triggered repeated synchronous DOM layout recalculations. Moving to streaming blob extraction and worker-based compression prevents main-thread blocking.
      </p>

      <h2 style="color: #b91c1c; font-size: 13px; text-transform: uppercase; margin-top: 16px;">3. Preventive Action Items</h2>
      <ul data-type="taskList">
        <li data-type="taskItem" data-checked="true"><label><input type="checkbox" checked="checked"><span></span></label><div><p>Implement chunked blob streaming for all image assets &mdash; <em>DevOps Lead</em></p></div></li>
        <li data-type="taskItem" data-checked="true"><label><input type="checkbox" checked="checked"><span></span></label><div><p>Add telemetry alert threshold for memory consumption &gt; 80MB &mdash; <em>SRE Team</em></p></div></li>
        <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Publish client-side recovery runbook &mdash; <em>Lead Architect</em></p></div></li>
      </ul>
    `,
  },
  {
    id: 'simple_nda',
    title: 'Mutual Confidentiality Brief (NDA)',
    description: 'Standard non-disclosure agreement with scope, terms, and signature blocks.',
    category: 'PERSONAL',
    thumbnailType: 'agreement',
    settings: {
      title: 'Mutual Non-Disclosure Agreement',
      margins: 'normal',
      orientation: 'portrait',
    },
    content: `
      <div style="border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 18px; text-align: center;">
        <h1 style="color: #0f172a; margin: 0; font-size: 22px; text-transform: uppercase; letter-spacing: 1px;">MUTUAL NON-DISCLOSURE AGREEMENT</h1>
        <p style="color: #64748b; font-size: 11px; margin: 4px 0 0 0;">Standard Mutual Confidentiality &bull; Effective Date: October 30, 2025</p>
      </div>

      <p style="color: #334155; font-size: 12px; line-height: 1.6;">
        This Mutual Non-Disclosure Agreement (the &ldquo;Agreement&rdquo;) is entered into between <strong>Party A</strong> and <strong>Party B</strong> for the purpose of preventing the unauthorized disclosure of Confidential Information shared between the parties.
      </p>

      <h2 style="color: #0f172a; font-size: 13px; text-transform: uppercase; margin-top: 16px;">1. Confidential Information Defined</h2>
      <p style="color: #334155; font-size: 12px; line-height: 1.6;">
        Confidential Information includes all non-public technical data, source code, business plans, software architectures, customer records, and commercial strategies disclosed by either party.
      </p>

      <h2 style="color: #0f172a; font-size: 13px; text-transform: uppercase; margin-top: 16px;">2. Obligations of Receiving Party</h2>
      <p style="color: #334155; font-size: 12px; line-height: 1.6;">
        The receiving party shall hold all Confidential Information in strict confidence and apply at least a reasonable standard of care to safeguard it against unauthorized disclosure or duplication.
      </p>

      <table style="width: 100%; border-collapse: separate; border-spacing: 16px 0; margin-top: 30px;">
        <tr>
          <td style="border-top: 1px solid #0f172a; padding-top: 6px; width: 50%; font-size: 11px;">
            <strong>Party A Representative:</strong> ____________________<br />
            <strong>Date:</strong> ____________________
          </td>
          <td style="border-top: 1px solid #0f172a; padding-top: 6px; width: 50%; font-size: 11px;">
            <strong>Party B Representative:</strong> ____________________<br />
            <strong>Date:</strong> ____________________
          </td>
        </tr>
      </table>
    `,
  },
];

// Helper: Load user custom templates from localStorage
export function loadCustomTemplates(): DocumentTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CUSTOM_TEMPLATES);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch (err) {
    console.warn('Failed to load custom templates from localStorage:', err);
  }
  return [];
}

// Helper: Save a new custom template to localStorage
export function saveCustomTemplate(
  data: Omit<DocumentTemplate, 'id' | 'createdAt' | 'isCustom'>
): DocumentTemplate {
  const existing = loadCustomTemplates();
  const id = `custom_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const newTemplate: DocumentTemplate = {
    ...data,
    id,
    isCustom: true,
    createdAt: new Date().toLocaleDateString(),
    thumbnailType: 'custom',
  };

  const updated = [newTemplate, ...existing];
  try {
    localStorage.setItem(STORAGE_KEY_CUSTOM_TEMPLATES, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save custom template to localStorage:', err);
  }
  return newTemplate;
}

// Helper: Delete a custom template
export function deleteCustomTemplate(id: string): void {
  const existing = loadCustomTemplates();
  const updated = existing.filter((t) => t.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY_CUSTOM_TEMPLATES, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to delete custom template:', err);
  }
}

// Helper: Export a template one-by-one in simple HTML format
export function exportTemplateAsHtml(template: DocumentTemplate): void {
  const safeName = (template.title || 'template')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_');
  const isDark = template.settings?.isDarkMode || template.settings?.pageColor === '#0f172a' || template.settings?.pageColor === '#18181b' || template.settings?.pageColor === '#1c1917';
  const pageColor = template.settings?.pageColor || (isDark ? '#0f172a' : '#ffffff');
  const textColor = isDark ? '#f8fafc' : '#1e293b';

  const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${template.title}</title>
  <meta name="description" content="${template.description || 'Document Template'}" />
  <meta name="template-category" content="${template.category}" />
  <meta name="template-author" content="${template.settings?.author || 'Word Processor'}" />
  <style>
    body {
      font-family: Calibri, 'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, sans-serif;
      line-height: 1.6;
      color: ${textColor};
      background-color: ${pageColor};
      max-width: 820px;
      margin: 40px auto;
      padding: 36px;
      box-sizing: border-box;
    }
    h1 { font-size: 26px; margin-bottom: 8px; }
    h2 { font-size: 18px; margin-top: 24px; margin-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
    th { background: rgba(0,0,0,0.04); font-weight: bold; }
    blockquote { border-left: 4px solid #185abd; margin: 16px 0; padding-left: 16px; font-style: italic; }
    ul, ol { padding-left: 24px; }
    code { background: rgba(0,0,0,0.06); padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 13px; }
  </style>
</head>
<body>
  ${template.content}
</body>
</html>`;

  const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${safeName}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// Helper: Import a template from simple HTML format
export async function importTemplateFromHtml(file: File): Promise<DocumentTemplate> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = (e.target?.result as string) || '';
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');

        // Extract title
        let title = doc.querySelector('title')?.textContent?.trim();
        if (!title) {
          title = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        }

        // Extract category if present
        let categoryMeta = doc.querySelector('meta[name="template-category"]')?.getAttribute('content');
        let category: DocumentTemplate['category'] = 'CUSTOM';
        if (categoryMeta && ['PERSONAL', 'BUSINESS', 'REPORTS', 'THEMES', 'CUSTOM'].includes(categoryMeta.toUpperCase())) {
          category = categoryMeta.toUpperCase() as DocumentTemplate['category'];
        }

        // Extract description
        let description = doc.querySelector('meta[name="description"]')?.getAttribute('content') || `Imported from ${file.name}`;

        // Extract body content
        let content = doc.body ? doc.body.innerHTML : text;
        if (!content || content.trim() === '') {
          content = `<p>${text}</p>`;
        }

        const newTemplate = saveCustomTemplate({
          title,
          description,
          category,
          content,
          settings: {
            title,
          },
        });

        resolve(newTemplate);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read template HTML file'));
    reader.readAsText(file);
  });
}
