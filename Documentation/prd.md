# Project Requirements Document (PRD)

## Project Name
**GameSetAI**  
(AI-powered tennis match video editing and analysis app)

---

## Introduction
### Purpose
GameSetAI is an app designed to help tennis players, coaches, and clubs edit and analyze match videos. The MVP focuses on manual video editing, with plans to add automated editing and AI-driven insights in future versions.

### Target Audience
- **Tennis Players**: Amateur and professional players looking to review and edit their match videos.
- **Coaches**: Tennis coaches who want to provide feedback to their students using edited videos.
- **Clubs**: Tennis clubs that want to offer video editing as a service to their members.
- **Tournament Organizers**: Organizers who want to provide edited match videos and insights to participants.

---

## Core Features
### MVP (Minimum Viable Product)
1. **User Authentication**:
   - Sign up, log in, and manage user profiles.
2. **Video Upload**:
   - Allow users to upload match videos from their devices.
3. **Manual Video Editing**:
   - Provide an on-screen UI for users to manually edit videos (e.g., cut out downtime, trim clips).
   - Add a scoreboard to the video by recording the start time, end time, and winner of each point.
4. **Download Edited Video**:
   - Allow users to download the edited video to their device.

### Future Features
1. **Automated Video Editing**:
   - Use AI (computer vision) to automatically remove downtime and add a scoreboard.
2. **Match Statistics**:
   - Track serve percentages, winners, forced/unforced errors, and other key metrics.
3. **AI Insights**:
   - Provide pattern recognition (e.g., common errors, shot selection).
   - Generate highlight reels of key moments.

---

## User Flow
1. **User Onboarding**:
   - Sign up or log in.
   - Set up a profile (e.g., player, coach, or club).
2. **Upload Match Video**:
   - Upload a video of a tennis match.
3. **Manual Video Editing**:
   - Use the on-screen UI to manually edit the video (e.g., cut out downtime, trim clips).
   - Add a scoreboard by recording the start time, end time, and winner of each point.
4. **Download Edited Video**:
   - Download the edited video to your device.
5. **Future: Review Edited Match**:
   - Watch the edited video with match statistics and AI insights (future feature).

---

## Tech Stack
### Frontend
- **Framework**: React.js with TypeScript.
- **Styling**: Tailwind CSS or Material-UI.
- **Hosting**: Vercel.

### Backend
- **Framework**: Node.js with Express.js.
- **Database**: Local file system for video storage, Supabase (PostgreSQL) later.
- **Hosting**: Heroku, AWS/Google Cloud later.

### AI/ML (Future)
- **Libraries**: Python with OpenCV and TensorFlow.
- **Hosting**: Local scripts initially, with plans to move to AWS SageMaker or Google AI Platform.

### Containerization
- **Docker**: Use Docker for portability and scalability.

---

## In Scope vs. Out of Scope
### In Scope (MVP)
- User authentication and profile management.
- Video upload and manual editing.
- Adding a scoreboard to the video.
- Download edited videos.

### Out of Scope (Future)
- Automated video editing.
- Match statistics.
- AI insights.

---

## Milestones
1. **MVP Development**:
   - Develop core features (user authentication, video upload, manual editing, scoreboard, download).
   - Launch a beta version for testing.
2. **Version 1.0**:
   - Add automated video editing and improve the user interface.
   - Launch the app to the public.
3. **Future Updates**:
   - Add match statistics and AI insights.