---
title: Spring Boot Actuator themed personal portfolio
status: draft
created: 2026-08-15
updated: 2026-08-15
---

# PRD: Spring Boot Actuator themed personal portfolio

## 0. Document Purpose
This Product Requirement Document (PRD) outlines the specifications and requirements for Gokul's personal portfolio website. It is designed for Gokul as the developer to guide the design, structure, and implementation of the site. The PRD specifies a highly themed, interactive portfolio styled as a Spring Boot Actuator / Microservices Dashboard. It leverages glossary-anchored terms and structured functional requirements to ensure clean code execution via downstream BMad tools.

## 1. Vision
The goal is to build a visually engaging, themed developer portfolio that mimics an enterprise-grade **Spring Boot Actuator Dashboard**. Instead of presenting a traditional static resume, this portfolio showcases Gokul's expertise as a **Senior Java Backend Engineer** through interactive backend simulators running entirely on the client side. 
By presenting career history as "replica pods", project details as "service topology nodes", environment configurations as "/actuator/env" properties, and a contact form as a "Swagger UI endpoint", this site instantly proves backend knowledge to visiting recruiters and hiring managers. A key climax is the interactive **Resilience4j Outage Simulator**, which lets visitors crash the mock cluster and watch the system execute fallback actions and auto-recovery log pipelines in real time.

## 2. Target User

### 2.1 Jobs To Be Done
*   **Recruiters & Hiring Managers (Primary):** Need to quickly verify Gokul's technical stack (Java, Spring Boot, microservices, databases, caching, resilience) and career achievements in a memorable, interactive way.
*   **Gokul (Builder):** Wants a $0 budget, low-maintenance personal portfolio hosted on GitHub Pages that highlights backend capability without requiring a paid, running JVM server.

### 2.2 Key User Journeys
*   **UJ-1: Recruiter interacts with the Outage Simulator**
    *   **Persona + context:** Sarah, a technical recruiter looking for a Senior Java Developer, visits Gokul's portfolio.
    *   **Entry state:** Unauthenticated, lands on the main "System Health" page on desktop.
    *   **Path:** Sarah reads the JVM profile and clicks "Simulate Network Outage". The dashboard immediately transitions to a red "DEGRADED" state, showing error rates spike. The mock terminal starts spitting out simulated logs showing a database connection limit exception and a Resilience4j circuit breaker state transition (`CLOSED -> OPEN`).
    *   **Climax:** Sarah sees the system handle the error gracefully by showing a fallback warning banner and mock cached reads. She then clicks "Trigger Auto-Recovery" and watches the log terminal show the circuit breaker half-opening, validating a database connection, and closing (`HALF-OPEN -> CLOSED`) with system health returning to green.
    *   **Resolution:** Sarah is impressed by the interactive demonstration of advanced microservices concepts. She navigates to the Swagger tab to reach out.
*   **UJ-2: Recruiter sends a contact message via Swagger UI**
    *   **Persona + context:** Sarah wants to contact Gokul about an open role.
    *   **Entry state:** On the "Swagger UI Playground" tab.
    *   **Path:** Sarah clicks "Try it out" on the `POST /api/v1/contact` endpoint, edits the mock JSON request body with her name and email, and clicks "Execute".
    *   **Climax:** The system displays a `200 OK` JSON response indicating the message was successfully published to Kafka topic `visitor-messages`. The bottom terminal prints logs of the controller receiving the POST request and the producer publishing it to partition 0.
    *   **Resolution:** The form sends a real email behind the scenes (via EmailJS/Discord) `[ASSUMPTION-1]`, and Sarah sees a success notification.

## 3. Glossary
*   **Actuator Dashboard** — The main user interface style, presenting system statistics, system state, and environment details.
*   **Terminal Console** — The fixed terminal pane at the bottom of the workspace that prints simulated real-time backend execution logs.
*   **Service Topology Map** — An interactive node graph visual showing the mock microservices network (`api-gateway`, `auth-service`, `payment-service`, `notify-service`, `postgresql-db`).
*   **Replica Pods** — Visual card representations of Gokul's career history items, styled like Kubernetes pod statuses.
*   **Swagger Playground** — An interactive interface modeling the Swagger UI API client where users can execute mock REST calls.
*   **Outage Simulator** — The interactive workflow where visitors trigger a simulated network partition to inspect circuit-breaker behaviors.

## 4. Features

### 4.1 System Health Dashboard
**Description:** The default homepage presenting the core system stats (liveness probe status, mock Kafka broker connections, mock error rates), the developer's bio summary, and the outage simulation trigger buttons. Realizes UJ-1.

**Functional Requirements:**
#### FR-1: Liveness and Readiness Probe Display
The system must display real-time interactive statuses:
*   "Liveness Probe": Defaulting to `UP` (green).
*   "Active Broker Connections": Defaulting to `2 / 2` (blue) representing Kafka and Zookeeper.
*   "Error Rate": Defaulting to `0.00%` (green).
**Consequences:**
*   Metrics transition to red/degraded states during a simulated outage.

#### FR-2: Outage Simulation Controls
The user can toggle system outage states:
*   Clicking "Simulate Network Outage" shifts status to `DEGRADED` (red).
*   Clicking "Trigger Auto-Recovery" shifts status back to `UP` (green).
**Consequences:**
*   State changes update the Terminal Console with structured log sequences (`SqlExceptionHelper`, `PaymentCircuitBreaker` transitions).
*   Outage states update corresponding node borders in the Service Topology Map to red `[ASSUMPTION-2]`.

---

### 4.2 Cluster Service Topology Map
**Description:** A graphical representation of Gokul's projects modeled as a microservices dependency tree. Clicking any service node displays metadata, technology tags, and mock throughput metrics.

**Functional Requirements:**
#### FR-3: Node Graph Navigation
The system must render a visual network layout containing five key service nodes (`api-gateway`, `auth-service`, `payment-service`, `notify-service`, `postgresql-db`).
**Consequences:**
*   Clicking a node highlights it and opens a detail panel showing details (Description, Core Tech Stack, and Metrics).
*   During an active outage, links between `payment-service` and `postgresql-db` turn red, and metrics update to show 100% error rate on `payment-service`.

---

### 4.3 Env Configuration Property Registry
**Description:** A searchable table styled after the `/actuator/env` actuator endpoint, listing environment variable keys and values that reflect Gokul's backend skills and infrastructure knowledge.

**Functional Requirements:**
#### FR-4: Property Search Filtering
The user can input text in a search filter field.
**Consequences:**
*   The property table filters row items in real-time, matching either the property key (e.g. `gokul.skills.languages`) or value (e.g. `Java 17`).

---

### 4.4 Career Replica Pods
**Description:** A Kubernetes-themed list representing Gokul's employment history as active pod replicas. Clicking a replica displays the associated timeline, role, and achievements.

**Functional Requirements:**
#### FR-5: Pod Selection
The user can click between multiple career pods (e.g., `pod-experience-senior-neosoft-0`, `pod-experience-software-eng-1`).
**Consequences:**
*   Selecting a pod updates the main replica details card, displaying the timeline, role description, and a bulleted list of responsibilities.

---

### 4.5 Swagger UI Contact Playground
**Description:** A mock Swagger client allowing users to test a `POST /api/v1/contact` request. Sends real messages to Gokul via a static integration and logs events inside the Terminal Console. Realizes UJ-2.

**Functional Requirements:**
#### FR-6: Simulated Swagger Execution
The user can edit the JSON request payload and click "Execute".
**Consequences:**
*   The interface prints a mock HTTP response header (`200 OK`) and a Kafka queuing receipt JSON payload.
*   Simulated logs are appended to the Terminal Console detailing the payload ingestion.
*   Sends a real email payload behind the scenes via a free service integration (EmailJS or a Discord/Slack webhook) `[ASSUMPTION-1]`.

---

### 4.6 Centralized Data Configuration
**Description:** The portfolio acts as a presentation layer for data defined externally in a simple JSON structure, enabling easy updates without code changes.

**Functional Requirements:**
#### FR-7: JSON Data Hydration
All portfolio content, specifically project information, contact details, and work experience, must be dynamically loaded from a static JSON configuration file at runtime.
**Consequences:**
*   Adding a new project or updating contact info requires only modifying the JSON file, with no changes to the HTML or JS logic required.

---

## 5. Non-Goals (Explicit)
*   **No JVM Server Backend:** The app is a static single-page application (HTML/CSS/JS) to allow free hosting. It will not have a live Spring Boot JVM process running in production.
*   **No Real Kafka cluster:** Apache Kafka actions are fully simulated in client-side Javascript.
*   **No Database Persistence:** There is no postgres server. Properties and pod histories are loaded from a static local JSON catalog.
*   **No User Login/Auth:** The interface is public-facing; there is no login portal.

## 6. MVP Scope

### 6.1 In Scope
*   Single-file responsive HTML application implementing the dashboard theme.
*   Interactive state management (Outage, Recovery, Tab switching, Pod details, Node inspection).
*   Functional `/actuator/env` filter search.
*   Swagger contact form with terminal logging and EmailJS/Slack webhook delivery.
*   Static JSON configuration file for all dynamic portfolio data (projects, experience, contact details).

### 6.2 Out of Scope for MVP
*   Multiple HTML pages (everything must be bundled in one clean layout).
*   A real admin console to customize resume values (will be changed via the JSON config file).

## 7. Success Metrics
*   **SM-1:** Recruiter contact form submission translates to a real email delivery successfully. Validates FR-6.
*   **SM-2:** Page speed: Load time is under 1.5 seconds on mobile and desktop due to low asset footprint.
*   **SM-3:** The entire portfolio requires $0/month in maintenance costs (hosted on GitHub Pages, free APIs only).

## 8. Open Questions
1.  **Which contact integration do you prefer?** Should we use EmailJS (delivers to your email) or a free Discord/Slack webhook (delivers to your chat room)?
2.  **Resume Details Check:** Are there any additional achievements or timeline changes we should make to the pod listings before finalizing?

## 9. Assumptions Index
*   **[ASSUMPTION-1] (FR-6):** The contact form will deliver actual emails using EmailJS or a Discord/Slack webhook, rather than being 100% simulated.
*   **[ASSUMPTION-2] (FR-2):** Outage simulation affects the Topology tab visually, turning payment and database node borders/lines to red to denote connection failure.
