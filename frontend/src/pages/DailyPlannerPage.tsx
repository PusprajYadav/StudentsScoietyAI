import {
  BarChart3,
  BookOpenCheck,
  CheckCircle2,
  Share2,
  Target,
} from "lucide-react";
import { downloadBlobNatively } from "../lib/nativeDownload";
import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useLocation } from "react-router-dom";
import {
  createPost,
  defaultPlatformSettings,
  loadCommunityMemberships,
  loadPlatformSettings,
  loadVisibleCommunities,
} from "../lib/api";
import {
  buildPlannerSharedPostContent,
  getPlannerReportTags,
  mapPlannerShareCategoryToDiscussionKind,
  type PlannerShareCategory,
} from "../lib/plannerPost";
import {
  DAILY_PLANNER_STORAGE_KEY,
  loadDailyPlannerData,
  normalizeDailyPlannerData,
  saveDailyPlannerData,
} from "../features/my-room/daily-planner/storage";
import type {
  DailyPlannerData,
  DailyTarget,
  PlannerTask,
  StudyEntry,
} from "../features/my-room/daily-planner/types";
import {
  DEFAULT_PLANNER_SKILLS,
  addDaysToDateKey,
  averagePercent,
  buildDailySnapshot,
  canEditDatedEntry,
  canEditPlannerTask,
  clampPercent,
  createId,
  formatShortDateLabel,
  getTodayDateKey,
  isPastDateKey,
  sortByCreatedAt,
  summarizeSkillBuckets,
} from "../features/my-room/daily-planner/utils";
import {
  PlannerHeroSection,
  PlannerOverviewSection,
  PlannerTabSection,
  type PlannerTabItem,
} from "../features/my-room/daily-planner/components/plannerUi";
import {
  PlannerDaySection,
  PlannerShareSheet,
  PlannerSharedSection,
  PlannerStudySection,
  PlannerTargetsSection,
  PlannerTasksSection,
} from "../features/my-room/daily-planner/components/plannerSections";
import {
  emptyShareState,
  emptyStudyDraft,
  emptyTargetDraft,
  emptyTaskDraft,
  getDefaultShareCategory,
  type PlannerTab,
  type ShareState,
  type StudyDraft,
  type TargetDraft,
  type TaskDraft,
} from "../features/my-room/daily-planner/viewModels";
import { useAuthStore } from "../store/authStore";
import type { CommunityRow, PlatformSettingsRow } from "../types/database";

export function DailyPlannerPage() {
  const location = useLocation();
  const { user, profile } = useAuthStore();
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const todayKey = getTodayDateKey();
  const [plannerData, setPlannerData] = useState<DailyPlannerData>(() => loadDailyPlannerData());
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [taskDraft, setTaskDraft] = useState<TaskDraft>(emptyTaskDraft);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [targetDraft, setTargetDraft] = useState<TargetDraft>(emptyTargetDraft);
  const [editingTargetId, setEditingTargetId] = useState<string | null>(null);
  const [studyDraft, setStudyDraft] = useState<StudyDraft>(emptyStudyDraft);
  const [editingStudyId, setEditingStudyId] = useState<string | null>(null);
  const [shareState, setShareState] = useState<ShareState>(emptyShareState);
  const [activeTab, setActiveTab] = useState<PlannerTab>("overview");
  const [platformSettings, setPlatformSettings] = useState<PlatformSettingsRow>(defaultPlatformSettings);
  const [joinedCommunities, setJoinedCommunities] = useState<CommunityRow[]>([]);
  const [shareOptionsReady, setShareOptionsReady] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator === "undefined" ? true : navigator.onLine
  );

  useEffect(() => {
    const navState = location.state as { initialTab?: PlannerTab; smoothEntry?: boolean } | null;

    if (!navState?.initialTab) {
      return;
    }

    setActiveTab(navState.initialTab);

    if (navState.smoothEntry && typeof window !== "undefined") {
      window.requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }
  }, [location.state]);

  useEffect(() => {
    saveDailyPlannerData({
      ...plannerData,
      updatedAt: new Date().toISOString(),
    });
  }, [plannerData]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== DAILY_PLANNER_STORAGE_KEY) {
        return;
      }

      setPlannerData(loadDailyPlannerData());
    };

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("storage", handleStorage);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const selectedDateIsPast = isPastDateKey(selectedDate, todayKey);
  const tasksForDay = useMemo(
    () =>
      [...plannerData.tasks.filter((task) => task.date === selectedDate)].sort((left, right) => {
        if (left.completed !== right.completed) {
          return Number(left.completed) - Number(right.completed);
        }

        return left.createdAt.localeCompare(right.createdAt);
      }),
    [plannerData.tasks, selectedDate]
  );
  const targetsForDay = useMemo(
    () => sortByCreatedAt(plannerData.targets.filter((target) => target.date === selectedDate)),
    [plannerData.targets, selectedDate]
  );
  const studyEntriesForDay = useMemo(
    () => sortByCreatedAt(plannerData.studyEntries.filter((entry) => entry.date === selectedDate)),
    [plannerData.studyEntries, selectedDate]
  );

  const taskPercent = useMemo(
    () => averagePercent(tasksForDay.map((task) => task.progress)),
    [tasksForDay]
  );
  const targetPercent = useMemo(
    () => averagePercent(targetsForDay.map((target) => target.percent)),
    [targetsForDay]
  );
  const overallPercent = useMemo(() => {
    const parts = [];

    if (tasksForDay.length > 0) {
      parts.push(taskPercent);
    }

    if (targetsForDay.length > 0) {
      parts.push(targetPercent);
    }

    return averagePercent(parts);
  }, [targetPercent, targetsForDay.length, taskPercent, tasksForDay.length]);

  const completedTaskCount = useMemo(
    () => tasksForDay.filter((task) => task.completed).length,
    [tasksForDay]
  );
  const totalStudyMinutes = useMemo(
    () => studyEntriesForDay.reduce((total, entry) => total + (entry.minutes || 0), 0),
    [studyEntriesForDay]
  );
  const totalStudyTaskUnits = useMemo(
    () => studyEntriesForDay.reduce((total, entry) => total + (entry.taskUnits || 0), 0),
    [studyEntriesForDay]
  );
  const skillBuckets = useMemo(() => summarizeSkillBuckets(studyEntriesForDay), [studyEntriesForDay]);
  const availableSkills = useMemo(() => {
    const all = new Set(DEFAULT_PLANNER_SKILLS);
    plannerData.studyEntries.forEach((entry) => all.add(entry.skill));
    return Array.from(all);
  }, [plannerData.studyEntries]);

  const dailySnapshot = useMemo(
    () =>
      buildDailySnapshot({
        date: selectedDate,
        tasks: tasksForDay,
        targets: targetsForDay,
        studyEntries: studyEntriesForDay,
        overallPercent,
        taskPercent,
        targetPercent,
      }),
    [overallPercent, selectedDate, studyEntriesForDay, targetPercent, targetsForDay, taskPercent, tasksForDay]
  );
  const shareSnapshot = dailySnapshot;
  const shareCommunity = joinedCommunities.find((community) => community.id === shareState.communityId) || null;
  const allowedShareCategories = useMemo<PlannerShareCategory[]>(() => {
    if (shareState.destination !== "community" || !shareCommunity) {
      return ["study", "job", "anonymous"];
    }

    const mapped = shareCommunity.posting_modes.map((mode) =>
      mode === "study"
        ? "study"
        : mode === "job"
          ? "job"
          : "anonymous"
    );

    return Array.from(new Set(mapped));
  }, [shareCommunity, shareState.destination]);

  useEffect(() => {
    if (!shareState.open) {
      return;
    }

    if (!allowedShareCategories.includes(shareState.category)) {
      setShareState((current) => ({
        ...current,
        category: allowedShareCategories[0] || "study",
      }));
    }
  }, [allowedShareCategories, shareState.category, shareState.open]);

  useEffect(() => {
    if (!shareState.open || shareOptionsReady || !user) {
      return;
    }

    let cancelled = false;

    setShareState((current) => ({
      ...current,
      loading: true,
    }));

    void Promise.all([
      loadPlatformSettings(),
      loadVisibleCommunities(),
      loadCommunityMemberships(user.id),
    ])
      .then(([settings, communities, memberships]) => {
        if (cancelled) {
          return;
        }

        const joined = communities.filter((community) => memberships.has(community.id));
        setPlatformSettings(settings);
        setJoinedCommunities(joined);
        setShareOptionsReady(true);
        setShareState((current) => ({
          ...current,
          loading: false,
          communityId: current.communityId || joined[0]?.id || "",
        }));
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        toast.error(error instanceof Error ? error.message : "Could not load share options.");
        setShareState((current) => ({
          ...current,
          loading: false,
        }));
      });

    return () => {
      cancelled = true;
    };
  }, [shareOptionsReady, shareState.open, user]);

  function updatePlannerData(updater: (current: DailyPlannerData) => DailyPlannerData) {
    setPlannerData((current) => ({
      ...updater(current),
      updatedAt: new Date().toISOString(),
    }));
  }

  function resetTaskForm() {
    setTaskDraft(emptyTaskDraft());
    setEditingTaskId(null);
  }

  function resetTargetForm() {
    setTargetDraft(emptyTargetDraft());
    setEditingTargetId(null);
  }

  function resetStudyForm() {
    setStudyDraft(emptyStudyDraft());
    setEditingStudyId(null);
  }

  function getDefaultShareTitle() {
    return `Daily planner report • ${formatShortDateLabel(selectedDate)}`;
  }

  function openShareSheet() {
    if (!user || !profile) {
      toast.error("Sign in to share planner updates.");
      return;
    }

    if (!isOnline) {
      toast.error("Sharing needs an internet connection.");
      return;
    }

    setShareState({
      open: true,
      shareType: "daily_summary",
      destination: "discussion",
      category: getDefaultShareCategory(),
      title: getDefaultShareTitle(),
      note: "",
      communityId: joinedCommunities[0]?.id || "",
      loading: !shareOptionsReady,
      submitting: false,
    });
  }

  function startTaskEdit(task: PlannerTask) {
    if (!canEditPlannerTask(task, todayKey)) {
      toast.error("This task is locked and can no longer be edited.");
      return;
    }

    setEditingTaskId(task.id);
    setTaskDraft({
      title: task.title,
      type: task.type,
      progress: `${task.progress}`,
      notes: task.notes,
    });
  }

  function startTargetEdit(target: DailyTarget) {
    if (!canEditDatedEntry(target, todayKey)) {
      toast.error("Past targets are locked.");
      return;
    }

    setEditingTargetId(target.id);
    setTargetDraft({
      title: target.title,
      percent: `${target.percent}`,
      notes: target.notes,
    });
  }

  function startStudyEdit(entry: StudyEntry) {
    if (!canEditDatedEntry(entry, todayKey)) {
      toast.error("Past study entries are locked.");
      return;
    }

    setEditingStudyId(entry.id);
    setStudyDraft({
      skill: entry.skill,
      mode: entry.mode,
      minutes: entry.minutes ? `${entry.minutes}` : "",
      taskUnits: entry.taskUnits ? `${entry.taskUnits}` : "",
      notes: entry.notes,
    });
  }

  function handleTaskSubmit() {
    if (selectedDateIsPast) {
      toast.error("You can only add or edit tasks for today and future dates.");
      return;
    }

    const title = taskDraft.title.trim();
    if (!title) {
      toast.error("Task title is required.");
      return;
    }

    const nextProgress = clampPercent(Number(taskDraft.progress));
    const now = new Date().toISOString();

    if (editingTaskId) {
      const existingTask = plannerData.tasks.find((task) => task.id === editingTaskId);

      if (!existingTask || !canEditPlannerTask(existingTask, todayKey)) {
        toast.error("This task is locked and cannot be changed.");
        return;
      }

      updatePlannerData((current) => ({
        ...current,
        tasks: current.tasks.map((task) =>
          task.id === editingTaskId
            ? {
                ...task,
                title,
                type: taskDraft.type,
                progress: nextProgress,
                completed: nextProgress >= 100,
                completedAt: nextProgress >= 100 ? task.completedAt || now : null,
                notes: taskDraft.notes.trim(),
                updatedAt: now,
              }
            : task
        ),
      }));
      toast.success("Task updated.");
      resetTaskForm();
      return;
    }

    const createdTask: PlannerTask = {
      id: createId("task"),
      date: selectedDate,
      title,
      type: taskDraft.type,
      progress: nextProgress,
      completed: nextProgress >= 100,
      notes: taskDraft.notes.trim(),
      createdAt: now,
      updatedAt: now,
      completedAt: nextProgress >= 100 ? now : null,
    };

    updatePlannerData((current) => ({
      ...current,
      tasks: [...current.tasks, createdTask],
    }));
    toast.success("Task added.");
    resetTaskForm();
  }

  function toggleTaskComplete(task: PlannerTask) {
    if (!canEditPlannerTask(task, todayKey)) {
      toast.error("This task is locked and cannot be changed.");
      return;
    }

    const nextCompleted = !task.completed;
    const now = new Date().toISOString();

    updatePlannerData((current) => ({
      ...current,
      tasks: current.tasks.map((entry) =>
        entry.id === task.id
          ? {
              ...entry,
              completed: nextCompleted,
              progress: nextCompleted ? 100 : entry.progress >= 100 ? 90 : entry.progress,
              completedAt: nextCompleted ? now : null,
              updatedAt: now,
            }
          : entry
      ),
    }));
  }

  function deleteTask(task: PlannerTask) {
    if (!canEditPlannerTask(task, todayKey)) {
      toast.error("This task is locked and cannot be removed.");
      return;
    }

    updatePlannerData((current) => ({
      ...current,
      tasks: current.tasks.filter((entry) => entry.id !== task.id),
    }));
    if (editingTaskId === task.id) {
      resetTaskForm();
    }
    toast.success("Task removed.");
  }

  function handleTargetSubmit() {
    if (selectedDateIsPast) {
      toast.error("You can only add or edit targets for today and future dates.");
      return;
    }

    const title = targetDraft.title.trim();
    if (!title) {
      toast.error("Target title is required.");
      return;
    }

    const nextPercent = clampPercent(Number(targetDraft.percent));
    const now = new Date().toISOString();

    if (editingTargetId) {
      const existingTarget = plannerData.targets.find((target) => target.id === editingTargetId);
      if (!existingTarget || !canEditDatedEntry(existingTarget, todayKey)) {
        toast.error("This target is locked.");
        return;
      }

      updatePlannerData((current) => ({
        ...current,
        targets: current.targets.map((target) =>
          target.id === editingTargetId
            ? {
                ...target,
                title,
                percent: nextPercent,
                notes: targetDraft.notes.trim(),
                updatedAt: now,
              }
            : target
        ),
      }));
      toast.success("Target updated.");
      resetTargetForm();
      return;
    }

    updatePlannerData((current) => ({
      ...current,
      targets: [
        ...current.targets,
        {
          id: createId("target"),
          date: selectedDate,
          title,
          percent: nextPercent,
          notes: targetDraft.notes.trim(),
          createdAt: now,
          updatedAt: now,
        },
      ],
    }));
    toast.success("Target added.");
    resetTargetForm();
  }

  function deleteTarget(target: DailyTarget) {
    if (!canEditDatedEntry(target, todayKey)) {
      toast.error("This target is locked and cannot be removed.");
      return;
    }

    updatePlannerData((current) => ({
      ...current,
      targets: current.targets.filter((entry) => entry.id !== target.id),
    }));
    if (editingTargetId === target.id) {
      resetTargetForm();
    }
    toast.success("Target removed.");
  }

  function updateTargetPercent(target: DailyTarget, nextPercent: number) {
    if (!canEditDatedEntry(target, todayKey)) {
      toast.error("This target is locked.");
      return;
    }

    const clampedPercent = clampPercent(nextPercent);
    const now = new Date().toISOString();

    updatePlannerData((current) => ({
      ...current,
      targets: current.targets.map((entry) =>
        entry.id === target.id
          ? {
              ...entry,
              percent: clampedPercent,
              updatedAt: now,
            }
          : entry
      ),
    }));

    if (editingTargetId === target.id) {
      setTargetDraft((current) => ({
        ...current,
        percent: `${clampedPercent}`,
      }));
    }

    toast.success(clampedPercent >= 100 ? "Target marked done." : "Target progress updated.");
  }

  function handleStudySubmit() {
    if (selectedDateIsPast) {
      toast.error("You can only add or edit study entries for today and future dates.");
      return;
    }

    const skill = studyDraft.skill.trim();
    if (!skill) {
      toast.error("Choose or enter a skill.");
      return;
    }

    const minutes = studyDraft.mode === "time" ? Math.max(0, Math.round(Number(studyDraft.minutes) || 0)) : null;
    const taskUnits =
      studyDraft.mode === "tasks" ? Math.max(0, Math.round(Number(studyDraft.taskUnits) || 0)) : null;

    if (studyDraft.mode === "time" && !minutes) {
      toast.error("Enter study minutes.");
      return;
    }

    if (studyDraft.mode === "tasks" && !taskUnits) {
      toast.error("Enter completed task count.");
      return;
    }

    const now = new Date().toISOString();

    if (editingStudyId) {
      const existingEntry = plannerData.studyEntries.find((entry) => entry.id === editingStudyId);
      if (!existingEntry || !canEditDatedEntry(existingEntry, todayKey)) {
        toast.error("This study entry is locked.");
        return;
      }

      updatePlannerData((current) => ({
        ...current,
        studyEntries: current.studyEntries.map((entry) =>
          entry.id === editingStudyId
            ? {
                ...entry,
                skill,
                mode: studyDraft.mode,
                minutes,
                taskUnits,
                notes: studyDraft.notes.trim(),
                updatedAt: now,
              }
            : entry
        ),
      }));
      toast.success("Study entry updated.");
      resetStudyForm();
      return;
    }

    updatePlannerData((current) => ({
      ...current,
      studyEntries: [
        ...current.studyEntries,
        {
          id: createId("study"),
          date: selectedDate,
          skill,
          mode: studyDraft.mode,
          minutes,
          taskUnits,
          notes: studyDraft.notes.trim(),
          createdAt: now,
          updatedAt: now,
        },
      ],
    }));
    toast.success("Study session saved.");
    resetStudyForm();
  }

  function deleteStudyEntry(entry: StudyEntry) {
    if (!canEditDatedEntry(entry, todayKey)) {
      toast.error("This study entry is locked and cannot be removed.");
      return;
    }

    updatePlannerData((current) => ({
      ...current,
      studyEntries: current.studyEntries.filter((item) => item.id !== entry.id),
    }));
    if (editingStudyId === entry.id) {
      resetStudyForm();
    }
    toast.success("Study entry removed.");
  }

  function updateStudyEntryValue(entry: StudyEntry, nextValue: number) {
    if (!canEditDatedEntry(entry, todayKey)) {
      toast.error("This study entry is locked.");
      return;
    }

    const safeValue = Math.max(0, Math.round(nextValue));

    if (safeValue <= 0) {
      toast.error(entry.mode === "tasks" ? "Enter completed task count." : "Enter study minutes.");
      return;
    }

    const now = new Date().toISOString();

    updatePlannerData((current) => ({
      ...current,
      studyEntries: current.studyEntries.map((item) =>
        item.id === entry.id
          ? {
              ...item,
              minutes: entry.mode === "time" ? safeValue : null,
              taskUnits: entry.mode === "tasks" ? safeValue : null,
              updatedAt: now,
            }
          : item
      ),
    }));

    if (editingStudyId === entry.id) {
      setStudyDraft((current) => ({
        ...current,
        minutes: entry.mode === "time" ? `${safeValue}` : current.minutes,
        taskUnits: entry.mode === "tasks" ? `${safeValue}` : current.taskUnits,
      }));
    }

    toast.success(entry.mode === "tasks" ? "Study task count updated." : "Study minutes updated.");
  }

  function handleExport() {
    const blob = new Blob([JSON.stringify(plannerData, null, 2)], {
      type: "application/json",
    });
    const fileName = `daily-planner-backup-${todayKey}.json`;
    downloadBlobNatively(blob, fileName, () => {
      toast.success("Full planner backup exported.");
    }, (err: Error) => {
      toast.error("Export failed: " + err.message);
    });
  }

  function handleImportChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] || null;
    event.target.value = "";

    if (!file) {
      return;
    }

    void file
      .text()
      .then((value) => {
        const parsed = normalizeDailyPlannerData(JSON.parse(value) as unknown);
        setPlannerData(parsed);
        toast.success("Full planner history restored.");
      })
      .catch(() => {
        toast.error("That planner backup could not be imported.");
      });
  }

  async function handleShareSubmit() {
    if (!user || !profile) {
      toast.error("Sign in to share planner updates.");
      return;
    }

    if (!isOnline) {
      toast.error("Sharing needs an internet connection.");
      return;
    }

    if (shareState.destination === "community" && !shareCommunity) {
      toast.error("Choose a community first.");
      return;
    }

    const title = shareState.title.trim() || getDefaultShareTitle();

    setShareState((current) => ({
      ...current,
      submitting: true,
    }));

    try {
      await createPost({
        authorId: user.id,
        visibilityScope: shareState.destination,
        communityId: shareState.destination === "community" ? shareCommunity?.id : undefined,
        discussionKind: mapPlannerShareCategoryToDiscussionKind(shareState.category),
        title,
        content: buildPlannerSharedPostContent({
          note: shareState.note,
          snapshot: shareSnapshot,
        }),
        tags: getPlannerReportTags({
          category: shareState.category,
          shareType: shareState.shareType,
        }),
        isAnonymous: shareState.category === "anonymous",
        settings: platformSettings,
      });

      updatePlannerData((current) => ({
        ...current,
        sharedReports: [
          {
            id: createId("share"),
            date: selectedDate,
            title,
            category: shareState.category,
            shareType: shareState.shareType,
            destination: shareState.destination,
            communityId: shareState.destination === "community" ? shareCommunity?.id || null : null,
            sharedAt: new Date().toISOString(),
          },
          ...current.sharedReports,
        ],
      }));

      toast.success("Day report shared.");
      setShareState(emptyShareState());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not share day report.");
      setShareState((current) => ({
        ...current,
        submitting: false,
      }));
    }
  }

  const recentSharedReports = plannerData.sharedReports
    .filter((report) => report.shareType === "daily_summary")
    .slice(0, 4);
  const tabItems: PlannerTabItem[] = [
    {
      id: "overview",
      label: "Overview",
      helper: "Summary and planner day",
      count: `${overallPercent}%`,
      icon: BarChart3,
    },
    {
      id: "tasks",
      label: "Daily Tasks",
      helper: "Plan and complete tasks",
      count: `${tasksForDay.length}`,
      icon: CheckCircle2,
    },
    {
      id: "study",
      label: "Tracker",
      helper: "Log study sessions",
      count: `${studyEntriesForDay.length}`,
      icon: BookOpenCheck,
    },
    {
      id: "targets",
      label: "Targets",
      helper: "Track day goals",
      count: `${targetsForDay.length}`,
      icon: Target,
    },
    {
      id: "shared",
      label: "Shared",
      helper: "Recent day reports",
      count: `${recentSharedReports.length}`,
      icon: Share2,
    },
  ];

  const activeSection =
    activeTab === "overview" ? (
      <div className="space-y-4">
        <PlannerOverviewSection
          overallPercent={overallPercent}
          taskCount={tasksForDay.length}
          targetCount={targetsForDay.length}
          completedTaskCount={completedTaskCount}
          taskPercent={taskPercent}
          totalStudyMinutes={totalStudyMinutes}
          studyEntryCount={studyEntriesForDay.length}
          totalStudyTaskUnits={totalStudyTaskUnits}
        />
        <PlannerDaySection
          overallPercent={overallPercent}
          completedTaskCount={completedTaskCount}
          activeSkillCount={skillBuckets.length}
          taskPercent={taskPercent}
          targetPercent={targetPercent}
          dailySnapshot={dailySnapshot}
          recentSharedReports={recentSharedReports}
          onShare={openShareSheet}
        />
      </div>
    ) : activeTab === "tasks" ? (
      <PlannerTasksSection
        taskDraft={taskDraft}
        setTaskDraft={setTaskDraft}
        editingTaskId={editingTaskId}
        selectedDateIsPast={selectedDateIsPast}
        tasksForDay={tasksForDay}
        todayKey={todayKey}
        onSubmit={handleTaskSubmit}
        onReset={resetTaskForm}
        onToggleComplete={toggleTaskComplete}
        onStartEdit={startTaskEdit}
        onDelete={deleteTask}
        onStartNewTask={() => {
          resetTaskForm();
          setTaskDraft((current) => ({
            ...current,
            progress: "0",
          }));
        }}
      />
    ) : activeTab === "study" ? (
      <PlannerStudySection
        studyDraft={studyDraft}
        setStudyDraft={setStudyDraft}
        editingStudyId={editingStudyId}
        selectedDateIsPast={selectedDateIsPast}
        studyEntriesForDay={studyEntriesForDay}
        todayKey={todayKey}
        availableSkills={availableSkills}
        skillBuckets={skillBuckets}
        totalStudyMinutes={totalStudyMinutes}
        totalStudyTaskUnits={totalStudyTaskUnits}
        onSubmit={handleStudySubmit}
        onReset={resetStudyForm}
        onStartEdit={startStudyEdit}
        onDelete={deleteStudyEntry}
        onUpdateValue={updateStudyEntryValue}
      />
    ) : activeTab === "targets" ? (
      <PlannerTargetsSection
        targetDraft={targetDraft}
        setTargetDraft={setTargetDraft}
        editingTargetId={editingTargetId}
        selectedDateIsPast={selectedDateIsPast}
        targetsForDay={targetsForDay}
        todayKey={todayKey}
        onSubmit={handleTargetSubmit}
        onReset={resetTargetForm}
        onStartEdit={startTargetEdit}
        onDelete={deleteTarget}
        onUpdatePercent={updateTargetPercent}
        onStartNewTarget={() => {
          resetTargetForm();
          setTargetDraft((current) => ({
            ...current,
            percent: "0",
          }));
        }}
      />
    ) : (
      <PlannerSharedSection
        recentSharedReports={recentSharedReports}
        importInputRef={importInputRef}
        onExport={handleExport}
        onImportChange={handleImportChange}
      />
    );

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="tracker-shell p-3 sm:p-4">
        <div className="relative space-y-4">
          <PlannerHeroSection
            isOnline={isOnline}
            selectedDate={selectedDate}
            todayKey={todayKey}
            selectedDateIsPast={selectedDateIsPast}
            overallPercent={overallPercent}
            taskCount={tasksForDay.length}
            completedTaskCount={completedTaskCount}
            targetCount={targetsForDay.length}
            totalStudyMinutes={totalStudyMinutes}
            onPrevious={() => setSelectedDate((current) => addDaysToDateKey(current, -1))}
            onNext={() => setSelectedDate((current) => addDaysToDateKey(current, 1))}
            onChangeDate={setSelectedDate}
          />
          <PlannerTabSection
            items={tabItems}
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            selectedDate={selectedDate}
            selectedDateIsPast={selectedDateIsPast}
            todayKey={todayKey}
          />
          {activeSection}
        </div>
      </div>
      <PlannerShareSheet
        shareState={shareState}
        setShareState={setShareState}
        joinedCommunities={joinedCommunities}
        allowedShareCategories={allowedShareCategories}
        shareSnapshot={shareSnapshot}
        onClose={() => setShareState(emptyShareState())}
        onSubmit={() => void handleShareSubmit()}
      />
    </div>
  );
}
