let myRoomModulePromise: Promise<typeof import("../pages/MyRoomPage")> | null = null;
let dailyPlannerModulePromise: Promise<typeof import("../pages/DailyPlannerPage")> | null = null;
let resumeMakerModulePromise: Promise<typeof import("../pages/AtsResumeMakerPage")> | null = null;
let portfolioMakerModulePromise: Promise<typeof import("../pages/PortfolioMakerPage")> | null = null;
let whitebookNotebookModulePromise: Promise<typeof import("../features/my-room/whitebook/WhitebookNotebookPage")> | null = null;
let learningToolsModulePromise: Promise<typeof import("../pages/LearningToolsPage")> | null = null;
let emailServiceModulePromise: Promise<typeof import("../pages/EmailsPage")> | null = null;
let studyNotesModulePromise: Promise<typeof import("../components/tools/StudyNotesApp")> | null = null;
let toolWorkspacePageModulePromise: Promise<typeof import("../pages/ToolWorkspacePage")> | null = null;
let communitiesPageModulePromise: Promise<typeof import("../pages/CommunitiesPage")> | null = null;
let searchPageModulePromise: Promise<typeof import("../pages/SearchPage")> | null = null;
let profilePageModulePromise: Promise<typeof import("../pages/ProfilePage")> | null = null;
let profileSettingsPageModulePromise: Promise<typeof import("../pages/ProfileSettingsPage")> | null = null;
let realtimeMessagesPageModulePromise: Promise<typeof import("../pages/RealtimeMessagesPage")> | null = null;
let walletRechargePageModulePromise: Promise<typeof import("../pages/WalletRechargePage")> | null = null;
let adminPageModulePromise: Promise<typeof import("../pages/AdminPage")> | null = null;

export function preloadMyRoomModule() {
  myRoomModulePromise ??= import("../pages/MyRoomPage");
  return myRoomModulePromise;
}

export function preloadDailyPlannerModule() {
  dailyPlannerModulePromise ??= import("../pages/DailyPlannerPage");
  return dailyPlannerModulePromise;
}

export function preloadResumeMakerModule() {
  resumeMakerModulePromise ??= import("../pages/AtsResumeMakerPage");
  return resumeMakerModulePromise;
}

export function preloadPortfolioMakerModule() {
  portfolioMakerModulePromise ??= import("../pages/PortfolioMakerPage");
  return portfolioMakerModulePromise;
}

export function preloadWhitebookNotebookModule() {
  whitebookNotebookModulePromise ??= import("../features/my-room/whitebook/WhitebookNotebookPage");
  return whitebookNotebookModulePromise;
}

export function preloadLearningToolsModule() {
  learningToolsModulePromise ??= import("../pages/LearningToolsPage");
  return learningToolsModulePromise;
}

export function preloadEmailServiceModule() {
  emailServiceModulePromise ??= import("../pages/EmailsPage");
  return emailServiceModulePromise;
}

export function preloadToolWorkspacePageModule() {
  toolWorkspacePageModulePromise ??= import("../pages/ToolWorkspacePage");
  return toolWorkspacePageModulePromise;
}

export function preloadStudyNotesModule() {
  studyNotesModulePromise ??= import("../components/tools/StudyNotesApp");
  return studyNotesModulePromise;
}

export function preloadCommunitiesPageModule() {
  communitiesPageModulePromise ??= import("../pages/CommunitiesPage");
  return communitiesPageModulePromise;
}

export function preloadSearchPageModule() {
  searchPageModulePromise ??= import("../pages/SearchPage");
  return searchPageModulePromise;
}

export function preloadProfilePageModule() {
  profilePageModulePromise ??= import("../pages/ProfilePage");
  return profilePageModulePromise;
}

export function preloadProfileSettingsPageModule() {
  profileSettingsPageModulePromise ??= import("../pages/ProfileSettingsPage");
  return profileSettingsPageModulePromise;
}

export function preloadRealtimeMessagesPageModule() {
  realtimeMessagesPageModulePromise ??= import("../pages/RealtimeMessagesPage");
  return realtimeMessagesPageModulePromise;
}

export function preloadWalletRechargePageModule() {
  walletRechargePageModulePromise ??= import("../pages/WalletRechargePage");
  return walletRechargePageModulePromise;
}

export function preloadAdminPageModule() {
  adminPageModulePromise ??= import("../pages/AdminPage");
  return adminPageModulePromise;
}
