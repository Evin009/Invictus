// Base resume .tex skeleton. Layout/packages are fixed and must never be
// edited by the AI conversion step in /api/generate-resume-tex — only the
// {{TOKEN}} placeholders below get substituted. This keeps every generated
// resume compiling reliably under the 2-page cap enforced by
// src/agents/resume_tailor.py on the Python backend.
export const RESUME_TEMPLATE = String.raw`\documentclass[10pt,letterpaper]{article}
\usepackage[margin=0.75in]{geometry}
\usepackage{enumitem}
\usepackage{titlesec}
\usepackage{hyperref}
\usepackage{parskip}

\titleformat{\section}{\large\bfseries}{}{0em}{}[\titlerule]
\titlespacing*{\section}{0pt}{10pt}{6pt}
\setlist[itemize]{leftmargin=1.2em, itemsep=2pt, topsep=2pt}
\pagestyle{empty}

\begin{document}

\begin{center}
  {\LARGE \textbf{{{FULL_NAME}}}} \\[2pt]
  {{CONTACT_LINE}}
\end{center}

\section*{Education}
\begin{itemize}
{{EDUCATION_ITEMS}}
\end{itemize}

\section*{Experience}
\begin{itemize}
{{EXPERIENCE_ITEMS}}
\end{itemize}

{{PROJECTS_SECTION}}
\section*{Skills}
{{SKILLS_LINE}}

\end{document}
`
