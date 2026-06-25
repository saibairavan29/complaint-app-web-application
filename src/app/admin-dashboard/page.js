"use client";

import React, { useState, useEffect, useRef } from "react";
import FullscreenImageViewer from "../../components/FullscreenImageViewer";
import MediaImage from "../../components/MediaImage";
import MediaAudio from "../../components/MediaAudio";

const languageNames = {
  en: "English",
  hi: "Hindi",
  ta: "Tamil",
  te: "Telugu",
  mr: "Marathi",
  or: "Odia",
  bn: "Bengali",
  pa: "Punjabi",
  gu: "Gujarati",
  as: "Assamese",
  kn: "Kannada",
  ml: "Malayalam"
};


function AnimatedValue({ value, isPercent }) {
  const [count, setCount] = React.useState("0");
  React.useEffect(() => {
    if (value === undefined || value === null) return;
    const end = parseFloat(value) || 0;
    if (end === 0) {
      setCount(isPercent ? "0%" : "0");
      return;
    }
    const duration = 1000;
    const startTime = performance.now();
    let animationFrameId;

    const updateCount = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = progress * (2 - progress);
      const current = easedProgress * end;
      if (isPercent) {
        setCount(`${current.toFixed(1)}%`);
      } else {
        setCount(Math.round(current).toString());
      }
      if (progress < 1) {
        animationFrameId = requestAnimationFrame(updateCount);
      }
    };
    animationFrameId = requestAnimationFrame(updateCount);
    return () => cancelAnimationFrame(animationFrameId);
  }, [value, isPercent]);

  return <span>{count}</span>;
}

function AnimatedKpi({ value, label, colorClass, borderClass, rank, isPercent }) {
  return (
    <div className={`kpi-card enterprise-card rounded-xl border p-6 flex flex-col justify-between relative min-h-[140px] ${borderClass || ""}`}>
      <span className={`kpi-card-label text-base font-extrabold uppercase tracking-wide ${colorClass}`}>{label}</span>
      <span className="kpi-card-value text-4xl font-black mt-2">
        <AnimatedValue value={value} isPercent={isPercent} />
      </span>
      <div className="absolute top-4 right-5 text-slate-600 text-lg font-bold font-mono opacity-60">#{rank}</div>
    </div>
  );
}

const STATUS_DONUT_COLORS = {
  Pending: "#F97316",
  "In Progress": "#FBBF24",
  Completed: "#34D399",
  Resolved: "#5E6AD2",
  Rejected: "#F87171",
};

function polarToCartesian(cx, cy, radius, angleInDegrees) {
  const rad = ((angleInDegrees - 90) * Math.PI) / 180;
  return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
}

function describeDonutSlice(cx, cy, outerR, innerR, startAngle, endAngle) {
  if (endAngle - startAngle < 0.01) return "";
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
  const outerStart = polarToCartesian(cx, cy, outerR, endAngle);
  const outerEnd = polarToCartesian(cx, cy, outerR, startAngle);
  const innerStart = polarToCartesian(cx, cy, innerR, endAngle);
  const innerEnd = polarToCartesian(cx, cy, innerR, startAngle);
  return [
    "M", outerStart.x, outerStart.y,
    "A", outerR, outerR, 0, largeArc, 0, outerEnd.x, outerEnd.y,
    "L", innerEnd.x, innerEnd.y,
    "A", innerR, innerR, 0, largeArc, 1, innerStart.x, innerStart.y,
    "Z",
  ].join(" ");
}

function DonutChart({
  data,
  size = "default",
  filterStatus,
  onSliceClick,
  onSliceMouseMove,
  onSliceMouseLeave,
  centerLabel = "Logged",
}) {
  const large = size === "large";
  const outerR = large ? 100 : 82;
  const innerR = large ? 58 : 48;
  const cx = 120;
  const cy = 120;
  const total = (data || []).reduce((s, d) => s + d.count, 0);

  if (!data?.length || total === 0) {
    return (
      <div className="donut-chart-empty">No status data</div>
    );
  }

  let cursor = 0;
  const gap = 1.2;
  const slices = data.map((item) => {
    const sliceAngle = (item.count / total) * 360;
    const start = cursor + gap / 2;
    const end = cursor + sliceAngle - gap / 2;
    cursor += sliceAngle;
    return {
      ...item,
      path: describeDonutSlice(cx, cy, outerR, innerR, start, Math.max(start + 0.01, end)),
      color: STATUS_DONUT_COLORS[item.status] || "#94A3B8",
    };
  });

  return (
    <div className={`donut-chart-wrap${large ? " donut-chart-wrap--large" : ""}`}>
      <svg viewBox="0 0 240 240" className="donut-chart-svg" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        {slices.map((slice) =>
          slice.path ? (
            <path
              key={slice.status}
              d={slice.path}
              fill={slice.color}
              className={`donut-slice${filterStatus === slice.status ? " donut-slice--active" : ""}`}
              onClick={() => onSliceClick?.(slice.status)}
              onMouseMove={(e) => onSliceMouseMove?.(e, `Status: ${slice.status}`, slice)}
              onMouseLeave={onSliceMouseLeave}
            />
          ) : null
        )}
      </svg>
      <div className="donut-chart-center">
        <span className="donut-chart-center-label">{centerLabel}</span>
        <span className="donut-chart-center-value">{total}</span>
      </div>
    </div>
  );
}

function DonutLegend({ data, filterStatus, onItemClick }) {
  return (
    <div className="donut-legend chart-legend">
      {(data || []).map((item) => {
        const isFiltered = filterStatus === item.status;
        const dotColor = STATUS_DONUT_COLORS[item.status] || "#94A3B8";
        return (
          <button
            type="button"
            key={item.status}
            className={`donut-legend-item${isFiltered ? " donut-legend-item--active" : ""}`}
            onClick={() => onItemClick?.(item.status)}
          >
            <span className="donut-legend-dot" style={{ backgroundColor: dotColor }} />
            <span className="donut-legend-label chart-legend-label">{item.status}</span>
            <span className="donut-legend-value chart-legend-value">{item.count}</span>
          </button>
        );
      })}
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-pulse">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-slate-900/60 border border-slate-800 p-5 shadow-lg flex flex-col gap-4 h-[478px]">
          <div className="flex justify-between items-center">
            <div className="h-4 bg-slate-850 rounded w-1/2"></div>
            <div className="h-4 bg-slate-850 rounded w-16"></div>
          </div>
          <div className="w-full flex-1 bg-slate-950/40 rounded flex items-end justify-between p-6 gap-3 border border-slate-900">
            {[...Array(6)].map((_, idx) => (
              <div key={idx} className="bg-slate-850 rounded-t w-full" style={{ height: `${20 + idx * 12}%` }}></div>
            ))}
          </div>
        </div>
      ))}
      <div className="bg-slate-900/60 border border-slate-800 p-5 shadow-lg flex flex-col gap-4 h-[478px] lg:col-span-2">
        <div className="flex justify-between items-center">
          <div className="h-4 bg-slate-850 rounded w-1/3"></div>
          <div className="h-4 bg-slate-850 rounded w-16"></div>
        </div>
        <div className="w-full flex-1 bg-slate-950/40 rounded flex items-end justify-between p-6 gap-4 border border-slate-900">
          {[...Array(10)].map((_, idx) => (
            <div key={idx} className="bg-slate-850 rounded-t w-full" style={{ height: `${30 + (idx % 3) * 20}%` }}></div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="w-full animate-pulse bg-slate-950/40 border border-slate-850 p-4 rounded-sm flex flex-col gap-3">
      <div className="flex justify-between border-b border-slate-800 pb-2">
        <div className="h-4 bg-slate-850 rounded w-20"></div>
        <div className="h-4 bg-slate-850 rounded w-32"></div>
        <div className="h-4 bg-slate-850 rounded w-24"></div>
        <div className="h-4 bg-slate-850 rounded w-16"></div>
        <div className="h-4 bg-slate-850 rounded w-20"></div>
      </div>
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex justify-between py-2.5 border-b border-slate-900 last:border-0 items-center">
          <div className="h-3.5 bg-slate-850 rounded w-16"></div>
          <div className="h-3.5 bg-slate-850 rounded w-28"></div>
          <div className="h-3.5 bg-slate-850 rounded w-20"></div>
          <div className="h-3.5 bg-slate-850 rounded w-12"></div>
          <div className="h-5 bg-slate-850 rounded w-20"></div>
        </div>
      ))}
    </div>
  );
}

function ModalSkeleton() {
  return (
    <div className="w-full flex flex-col gap-6 animate-pulse">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-950 border border-slate-850 p-6 col-span-2 flex flex-col gap-4 min-h-[700px]">
          <div className="h-4 bg-slate-850 rounded w-1/4"></div>
          <div className="w-full flex-1 bg-slate-900/50 rounded flex items-end justify-between p-6 gap-3 border border-slate-900">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-slate-850 rounded-t w-full" style={{ height: `${20 + i * 12}%` }}></div>
            ))}
          </div>
        </div>
        <div className="bg-slate-950 border border-slate-850 p-4 flex flex-col gap-4">
          <div className="h-3 w-1/3 bg-slate-850 rounded"></div>
          <div className="flex flex-col gap-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex justify-between border-b border-slate-900 pb-2">
                <div className="h-3 bg-slate-850 rounded w-20"></div>
                <div className="h-3 bg-slate-850 rounded w-10"></div>
              </div>
            ))}
          </div>
          <div className="bg-slate-900/50 p-4 border border-slate-900 rounded-sm mt-auto flex flex-col gap-2.5">
            <div className="h-3 bg-slate-850 rounded w-1/2"></div>
            <div className="h-3 bg-slate-850 rounded w-2/3"></div>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <div className="h-3 w-40 bg-slate-850 rounded"></div>
        <div className="h-24 bg-slate-950 border border-slate-850 rounded"></div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  // Authentication & Session States
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [csrfToken, setCsrfToken] = useState("");
  const [adminUsername, setAdminUsername] = useState("");
  const [isSuperuser, setIsSuperuser] = useState(false);

  // Phase 5.6 UI/UX & theme states
  const [theme, setTheme] = React.useState("dark");
  const [expandedChart, setExpandedChart] = React.useState(null);
  const [expandedAnalytics, setExpandedAnalytics] = React.useState(null);
  const [loadingExpandedAnalytics, setLoadingExpandedAnalytics] = React.useState(false);
  const [expandedRangeType, setExpandedRangeType] = React.useState("30days");
  const [expandedStartDate, setExpandedStartDate] = React.useState("");
  const [expandedEndDate, setExpandedEndDate] = React.useState("");
  const [notificationSearch, setNotificationSearch] = React.useState("");
  const [notificationTab, setNotificationTab] = React.useState("all");
  const [showDiagnosticsExpanded, setShowDiagnosticsExpanded] = useState(false);
  const [isFullscreenChart, setIsFullscreenChart] = useState(false);

  // Master Data Management states
  const [masterDataTab, setMasterDataTab] = useState("projects");
  const [masterProjects, setMasterProjects] = useState([]);
  const [masterLocations, setMasterLocations] = useState([]);
  const [masterCategories, setMasterCategories] = useState([]);
  const [masterLanguages, setMasterLanguages] = useState([]);
  const [masterBusinessUnits, setMasterBusinessUnits] = useState([]);
  const [loadingMasterData, setLoadingMasterData] = useState(false);
  const [masterEditItem, setMasterEditItem] = useState(null);
  const [masterForm, setMasterForm] = useState({});

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
  };

  const [activeDrilldownRowId, setActiveDrilldownRowId] = useState(null);

  const handleExpandChart = (chartType) => {
    // Save scroll position and lock body scroll
    window.__savedScrollY = window.scrollY;
    document.body.style.overflow = "hidden";
    
    setIsFullscreenChart(false);
    setExpandedChart(chartType);
    
    // Preserve date range: if modal's range filters are empty, initialize them from main page's filters
    let range = expandedRangeType;
    let start = expandedStartDate;
    let end = expandedEndDate;
    
    if (!range || (range === "30days" && (filterStartDate || filterEndDate))) {
      if (filterStartDate || filterEndDate) {
        range = "custom";
        start = filterStartDate;
        end = filterEndDate;
      } else {
        range = "30days";
        start = "";
        end = "";
      }
      setExpandedRangeType(range);
      setExpandedStartDate(start);
      setExpandedEndDate(end);
    }

    fetchExpandedAnalytics(chartType, range, start, end);
  };

  const handleCloseChart = () => {
    setExpandedChart(null);
    setExpandedAnalytics(null);
    setIsFullscreenChart(false);
    // Restore body scroll and scroll position
    document.body.style.overflow = "";
    if (window.__savedScrollY !== undefined) {
      setTimeout(() => {
        window.scrollTo(0, window.__savedScrollY);
      }, 50);
    }
  };

  const fetchExpandedAnalytics = async (chartType = expandedChart, rangeType = expandedRangeType, startDate = expandedStartDate, endDate = expandedEndDate) => {
    if (!chartType) return;
    try {
      setLoadingExpandedAnalytics(true);
      const params = new URLSearchParams();
      params.append("range_type", rangeType || "30days");
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);
      
      // Dashboard filter state
      if (filterProject) params.append("project", filterProject);
      if (filterLocation) params.append("location", filterLocation);
      if (filterCategory) params.append("category", filterCategory);
      if (filterStatus) params.append("status", filterStatus);
      
      // Interactive chart filter state
      if (chartFilterStatus) params.append("status", chartFilterStatus);
      if (chartFilterCategory) params.append("category", chartFilterCategory);
      if (chartFilterProject) {
        const pMatch = projectsList.find((p) => p.name === chartFilterProject);
        if (pMatch) params.append("project", pMatch.id);
      }
      if (chartFilterLocation) {
        const lMatch = locationsList.find((l) => l.name === chartFilterLocation);
        if (lMatch) params.append("location", lMatch.id);
      }
      if (chartFilterMonth) {
        const [year, month] = chartFilterMonth.split("-");
        params.append("start_date", `${year}-${month}-01`);
        params.append("end_date", `${year}-${month}-${new Date(year, month, 0).getDate()}`);
      }
      
      const res = await fetch(`http://localhost:8000/api/dashboard/analytics/?${params.toString()}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setExpandedAnalytics(data);
      }
    } catch (err) {
      console.error("Failed to fetch expanded analytics:", err);
    } finally {
      setLoadingExpandedAnalytics(false);
    }
  };

  // Tab State: "overview" | "complaints" | "settings"
  const [activeTab, setActiveTab] = useState("overview");

  // Dashboard Data States
  const [summary, setSummary] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [complaintsData, setComplaintsData] = useState({ results: [], count: 0 });
  const [projectsList, setProjectsList] = useState([]);
  const [locationsList, setLocationsList] = useState([]);

  // Speech & Queue States
  const [filterSubmissionType, setFilterSubmissionType] = useState("");
  const [filterSpeechStatus, setFilterSpeechStatus] = useState("");
  const [filterHasAudio, setFilterHasAudio] = useState("");
  
  const [failedJobsList, setFailedJobsList] = useState([]);
  const [failedSelectedIds, setFailedSelectedIds] = useState([]);
  const [isReprocessingBulk, setIsReprocessingBulk] = useState(false);
  const [isReprocessingSingle, setIsReprocessingSingle] = useState(false);
  const [copiedTranscript, setCopiedTranscript] = useState(false);
  const [copiedTranslation, setCopiedTranslation] = useState(false);

  // Fetch / Loading States
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const [loadingComplaints, setLoadingComplaints] = useState(true);

  // Error States
  const [errorSummary, setErrorSummary] = useState(false);
  const [errorAnalytics, setErrorAnalytics] = useState(false);
  const [errorComplaints, setErrorComplaints] = useState(false);

  // Search, Filters & Pagination States
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  
  const [filterProject, setFilterProject] = useState("");
  const [filterLocation, setFilterLocation] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterLanguage, setFilterLanguage] = useState("");
  const [filterBusinessUnit, setFilterBusinessUnit] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [sortingState, setSortingState] = useState("-created_at"); // default newest first

  // Interactive Chart Filters (Multi-Dimensional Chart Clicks)
  const [chartFilterStatus, setChartFilterStatus] = useState("");
  const [chartFilterCategory, setChartFilterCategory] = useState("");
  const [chartFilterProject, setChartFilterProject] = useState("");
  const [chartFilterLocation, setChartFilterLocation] = useState("");
  const [chartFilterMonth, setChartFilterMonth] = useState("");

  // Chart Hover Tooltips State
  const [hoveredData, setHoveredData] = useState(null); // { title: "...", total: X, counts: {...}, x: Y, y: Z }

  // Notifications Drawer & Counts States
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotificationsDrawer, setShowNotificationsDrawer] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  // User Management Module States (Superuser Only)
  const [adminUsers, setAdminUsers] = useState([]);
  const [loadingAdminUsers, setLoadingAdminUsers] = useState(false);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  
  // User Forms
  const [newUsername, setNewUsername] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newConfirmPassword, setNewConfirmPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState("Admin");
  const [createUserError, setCreateUserError] = useState("");

  const [resetUserId, setResetUserId] = useState("");
  const [resetUsername, setResetUsername] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetPasswordError, setResetPasswordError] = useState("");

  const [editingUserId, setEditingUserId] = useState(null);
  const [editingEmail, setEditingEmail] = useState("");
  const [editingRole, setEditingRole] = useState("Admin");

  // Audit Logs State
  const [activityLogs, setActivityLogs] = useState([]);
  const [loadingActivityLogs, setLoadingActivityLogs] = useState(false);

  // Phase 6 Diagnostics & Monitoring States
  const [systemHealth, setSystemHealth] = useState(null);
  const [loadingHealth, setLoadingHealth] = useState(true);
  const [diagnostics, setDiagnostics] = useState(null);
  const [loadingDiagnostics, setLoadingDiagnostics] = useState(true);
  const [diagnosticsDays, setDiagnosticsDays] = useState("7");
  const [triggeringBackup, setTriggeringBackup] = useState(false);
  const [restoringBackup, setRestoringBackup] = useState(false);
  const [backupActionMsg, setBackupActionMsg] = useState("");

  // Auto Refresh locks
  const isRefreshingKpisRef = useRef(false);
  const isRefreshingNotifsRef = useRef(false);
  const lastUpdatedNotifCountRef = useRef(0);

  // Modal / Detail States
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [updatingStatusState, setUpdatingStatusState] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const [zoomScale, setZoomScale] = useState(1);
  const [complaintHistory, setComplaintHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Custom Seekable Audio Player state
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioIsPlaying, setAudioIsPlaying] = useState(false);
  const audioElRef = useRef(null);

  // Refs to store volatile state values for optimized auto-refresh dependency loops
  const hoveredDataRef = useRef(null);
  const chartFilterStatusRef = useRef("");
  const chartFilterCategoryRef = useRef("");
  const chartFilterProjectRef = useRef("");
  const chartFilterLocationRef = useRef("");
  const chartFilterMonthRef = useRef("");
  const activeTabRef = useRef("overview");
  const selectedComplaintRef = useRef(null);
  const showCreateUserModalRef = useRef(false);
  const showResetPasswordModalRef = useRef(false);
  const editingUserIdRef = useRef(null);

  // Timeout refs for tooltip hover stability (appearing and disappearing delays)
  const tooltipShowTimeoutRef = useRef(null);
  const tooltipHideTimeoutRef = useRef(null);

  // Clean up tooltip timeouts on unmount
  useEffect(() => {
    return () => {
      if (tooltipShowTimeoutRef.current) clearTimeout(tooltipShowTimeoutRef.current);
      if (tooltipHideTimeoutRef.current) clearTimeout(tooltipHideTimeoutRef.current);
    };
  }, []);

  // Sync state changes with refs to avoid re-triggering useEffect intervals
  useEffect(() => { hoveredDataRef.current = hoveredData; }, [hoveredData]);
  useEffect(() => { chartFilterStatusRef.current = chartFilterStatus; }, [chartFilterStatus]);
  useEffect(() => { chartFilterCategoryRef.current = chartFilterCategory; }, [chartFilterCategory]);
  useEffect(() => { chartFilterProjectRef.current = chartFilterProject; }, [chartFilterProject]);
  useEffect(() => { chartFilterLocationRef.current = chartFilterLocation; }, [chartFilterLocation]);
  useEffect(() => { chartFilterMonthRef.current = chartFilterMonth; }, [chartFilterMonth]);
  useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);
  useEffect(() => { selectedComplaintRef.current = selectedComplaint; }, [selectedComplaint]);
  useEffect(() => { showCreateUserModalRef.current = showCreateUserModal; }, [showCreateUserModal]);
  useEffect(() => { showResetPasswordModalRef.current = showResetPasswordModal; }, [showResetPasswordModal]);
  useEffect(() => { editingUserIdRef.current = editingUserId; }, [editingUserId]);

  // Last Updated Sync Time
  const [lastUpdated, setLastUpdated] = useState("");

  // Search Debouncing (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Reset location filter if project filter changes
  useEffect(() => {
    setFilterLocation("");
    if (filterProject) {
      fetchLocationsForProject(filterProject);
    } else {
      setLocationsList([]);
    }
  }, [filterProject]);

  // Trigger data fetches on boot/tab/filter/pagination changes
  useEffect(() => {
    if (isAuthenticated) {
      fetchSummary();
      fetchAnalytics();
      fetchProjects();
      fetchNotifications();
      fetchFailedJobs();
      fetchHealth();
      fetchDiagnostics(diagnosticsDays);
      if (isSuperuser) {
        fetchAdminUsers();
        fetchActivityLogs();
      }
    }
  }, [isAuthenticated, isSuperuser, diagnosticsDays]);

  // Handle complaint-specific status history when modal opens
  useEffect(() => {
    if (selectedComplaint) {
      fetchComplaintHistory(selectedComplaint.id);
      // Lock body scroll and reset audio states
      document.body.style.overflow = "hidden";
      setAudioDuration(0);
      setAudioCurrentTime(0);
      setAudioIsPlaying(false);
    } else {
      setComplaintHistory([]);
      // Restore body scroll (only if expanded chart modal isn't open)
      if (!expandedChart) {
        document.body.style.overflow = "";
      }
    }
  }, [selectedComplaint]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchComplaints();
    }
  }, [
    isAuthenticated,
    debouncedSearch,
    filterProject,
    filterLocation,
    filterCategory,
    filterStatus,
    filterLanguage,
    filterBusinessUnit,
    filterStartDate,
    filterEndDate,
    filterSubmissionType,
    filterSpeechStatus,
    filterHasAudio,
    chartFilterStatus,
    chartFilterCategory,
    chartFilterProject,
    chartFilterLocation,
    chartFilterMonth,
    currentPage,
    sortingState
  ]);

  useEffect(() => {
    if (isAuthenticated && expandedChart) {
      fetchExpandedAnalytics(expandedChart, expandedRangeType, expandedStartDate, expandedEndDate);
    }
  }, [
    isAuthenticated,
    expandedChart,
    expandedRangeType,
    expandedStartDate,
    expandedEndDate,
    filterProject,
    filterLocation,
    filterCategory,
    filterStatus,
    chartFilterStatus,
    chartFilterCategory,
    chartFilterProject,
    chartFilterLocation,
    chartFilterMonth
  ]);

  useEffect(() => {
    if (isAuthenticated && activeTab === "master-data") {
      fetchMasterData();
    }
  }, [isAuthenticated, activeTab]);

  // Phase 5.6 bootstrapping
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "dark";
    setTheme(savedTheme);
  }, []);

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!selectedComplaint) return;
      if (e.key === "Escape") {
        setSelectedComplaint(null);
      } else if (e.key === "ArrowLeft") {
        navigateComplaintDetail("prev");
      } else if (e.key === "ArrowRight") {
        navigateComplaintDetail("next");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedComplaint, complaintsData]);

  // Check Auth & CSRF Bootstrap on page mount
  useEffect(() => {
    bootstrapAuth();
  }, []);

  // Auto-Refresh loops
  useEffect(() => {
    if (!isAuthenticated) return;

    // 1. KPI cards, intelligence, and analytics charts refresh every 60 seconds
    const kpiInterval = setInterval(() => {
      triggerBackgroundKpiRefresh();
    }, 60000);

    // 2. Notification counts refresh every 30 seconds
    const notifInterval = setInterval(() => {
      triggerBackgroundNotificationRefresh();
    }, 30000);

    return () => {
      clearInterval(kpiInterval);
      clearInterval(notifInterval);
    };
  }, [isAuthenticated]);

  // Bootstrapping Authentication
  const bootstrapAuth = async () => {
    try {
      setCheckingAuth(true);
      const csrfRes = await fetch("http://localhost:8000/api/admin/csrf/", { credentials: "include" });
      if (csrfRes.ok) {
        const csrfData = await csrfRes.json();
        setCsrfToken(csrfData.csrfToken);
      }

      const authRes = await fetch("http://localhost:8000/api/admin/check-auth/", { credentials: "include" });
      if (authRes.ok) {
        const authData = await authRes.json();
        if (authData.authenticated) {
          setIsAuthenticated(true);
          setAdminUsername(authData.username);
          setIsSuperuser(authData.is_superuser);
          setLastUpdated(new Date().toLocaleTimeString());
        }
      }
    } catch (err) {
      console.error("Auth bootstrapping failed:", err);
    } finally {
      setCheckingAuth(false);
    }
  };

  // Login handler
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!usernameInput || !passwordInput) {
      setAuthError("Please fill in all fields.");
      return;
    }

    try {
      setLoggingIn(true);
      setAuthError("");
      const res = await fetch("http://localhost:8000/api/admin/login/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrfToken
        },
        body: JSON.stringify({
          username: usernameInput,
          password: passwordInput
        }),
        credentials: "include"
      });

      if (res.ok) {
        const data = await res.json();
        setIsAuthenticated(true);
        setAdminUsername(data.username);
        setIsSuperuser(data.is_admin && usernameInput === "admin" ? true : false); // default fallback check or re-call bootstrap
        setLastUpdated(new Date().toLocaleTimeString());
        bootstrapAuth(); // reload roles
      } else {
        const errData = await res.json();
        setAuthError(errData.detail || "Invalid credentials.");
      }
    } catch (err) {
      console.error("Login request failed:", err);
      setAuthError("Server unavailable. Ensure backend is running.");
    } finally {
      setLoggingIn(false);
    }
  };

  // Logout handler
  const handleLogout = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/admin/logout/", {
        method: "POST",
        headers: {
          "X-CSRFToken": csrfToken
        },
        credentials: "include"
      });
      if (res.ok) {
        setIsAuthenticated(false);
        setAdminUsername("");
        setIsSuperuser(false);
        setUsernameInput("");
        setPasswordInput("");
        setSummary(null);
        setAnalytics(null);
        setComplaintsData({ results: [], count: 0 });
        setActiveTab("overview");
      }
    } catch (err) {
      console.error("Logout request failed:", err);
    }
  };

  // Fetch KPI statistics
  const fetchSummary = async () => {
    if (isRefreshingKpisRef.current) return;
    try {
      setLoadingSummary(true);
      setErrorSummary(false);
      const res = await fetch("http://localhost:8000/api/dashboard/summary/", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      } else {
        setErrorSummary(true);
      }
    } catch (err) {
      setErrorSummary(true);
    } finally {
      setLoadingSummary(false);
    }
  };

  // Fetch failed transcription jobs
  const fetchFailedJobs = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/complaints/?transcription_status=FAILED&page_size=100", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setFailedJobsList(data.results || []);
      }
    } catch (err) {
      console.error("Failed to load failed jobs queue:", err);
    }
  };

  // Fetch System Health
  const fetchHealth = async () => {
    try {
      setLoadingHealth(true);
      const res = await fetch("http://localhost:8000/api/health/", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setSystemHealth(data);
      }
    } catch (err) {
      console.error("Failed to load health status:", err);
    } finally {
      setLoadingHealth(false);
    }
  };

  // Fetch Telemetry & Diagnostics
  const fetchDiagnostics = async (days = "7") => {
    try {
      setLoadingDiagnostics(true);
      const res = await fetch(`http://localhost:8000/api/dashboard/diagnostics/?days=${days}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setDiagnostics(data);
      }
    } catch (err) {
      console.error("Failed to load diagnostics:", err);
    } finally {
      setLoadingDiagnostics(false);
    }
  };

  // Trigger Manual Backup
  const handleTriggerBackup = async (type = "database") => {
    try {
      setTriggeringBackup(true);
      setBackupActionMsg("");
      const res = await fetch("http://localhost:8000/api/dashboard/diagnostics/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrfToken
        },
        body: JSON.stringify({
          action: type === "database" ? "backup_db" : "backup_media"
        }),
        credentials: "include"
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setBackupActionMsg(`Backup created successfully: ${data.file_name} (${(data.file_size/1024).toFixed(1)} KB)`);
        fetchDiagnostics(diagnosticsDays);
      } else {
        setBackupActionMsg(`Backup failed: ${data.detail || data.status || "Unknown error"}`);
      }
    } catch (err) {
      setBackupActionMsg("Backup failed due to a network error.");
    } finally {
      setTriggeringBackup(false);
    }
  };

  // Trigger Restore Backup
  const handleRestoreBackup = async (fileName) => {
    if (!confirm(`Are you absolutely sure you want to restore the backup "${fileName}"? This will overwrite the current database!`)) {
      return;
    }
    try {
      setRestoringBackup(true);
      setBackupActionMsg("");
      const res = await fetch("http://localhost:8000/api/dashboard/diagnostics/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrfToken
        },
        body: JSON.stringify({
          action: "restore_db",
          file_name: fileName
        }),
        credentials: "include"
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setBackupActionMsg("Database restored successfully! Refreshing dashboard...");
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setBackupActionMsg(`Restore failed: ${data.detail || data.message || "Unknown error"}`);
      }
    } catch (err) {
      setBackupActionMsg("Restore failed due to a network error.");
    } finally {
      setRestoringBackup(false);
    }
  };

  // Bulk Reprocess action
  const handleBulkReprocess = async () => {
    if (failedSelectedIds.length === 0) return;
    setIsReprocessingBulk(true);
    try {
      const res = await fetch("http://localhost:8000/api/complaints/bulk-reprocess/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrfToken
        },
        body: JSON.stringify({ ids: failedSelectedIds }),
        credentials: "include"
      });
      if (res.ok) {
        alert(`Successfully queued ${failedSelectedIds.length} complaints for reprocessing.`);
        setFailedSelectedIds([]);
        handleForceRefresh();
      } else {
        alert("Bulk reprocessing failed.");
      }
    } catch (err) {
      console.error(err);
      alert("Network error executing bulk reprocess.");
    } finally {
      setIsReprocessingBulk(false);
    }
  };

  // Reprocess single transcript
  const handleReprocessSingle = async (complaintId) => {
    setIsReprocessingSingle(true);
    try {
      const res = await fetch(`http://localhost:8000/api/complaints/${complaintId}/reprocess/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrfToken
        },
        credentials: "include"
      });
      if (res.ok) {
        const updatedComplaint = await res.json();
        setSelectedComplaint(updatedComplaint);
        handleForceRefresh();
        alert("Queued reprocessing task successfully.");
      } else {
        alert("Failed to queue reprocessing task.");
      }
    } catch (err) {
      console.error(err);
      alert("Network error executing reprocess.");
    } finally {
      setIsReprocessingSingle(false);
    }
  };

  // Download transcript file helper
  const handleDownloadTranscript = (complaint) => {
    const text = `Ticket Reference: ${complaint.reference_number}
Category: ${complaint.category}
Project: ${complaint.project_name}
Location: ${complaint.location_name}
Date: ${new Date(complaint.created_at).toLocaleString()}

Original Language: ${complaint.language}
Detected Language: ${complaint.detected_language || "N/A"}
Confidence: ${complaint.transcript_confidence ? Math.round(complaint.transcript_confidence * 100) + '%' : "N/A"}
Audio Duration: ${complaint.audio_duration_seconds ? complaint.audio_duration_seconds + ' seconds' : "N/A"}

Original Transcript:
"${complaint.transcript || complaint.original_text || ""}"

English Translation:
"${complaint.english_translation || ""}"
`;
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Transcript_${complaint.reference_number}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Fetch Analytics distribution charts
  const fetchAnalytics = async () => {
    if (isRefreshingKpisRef.current) return;
    try {
      setLoadingAnalytics(true);
      setErrorAnalytics(false);
      const res = await fetch("http://localhost:8000/api/dashboard/analytics/", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      } else {
        setErrorAnalytics(true);
      }
    } catch (err) {
      setErrorAnalytics(true);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  // Fetch Projects list
  const fetchProjects = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/projects/");
      if (res.ok) {
        const data = await res.json();
        setProjectsList(data);
      }
    } catch (err) {
      console.error("Failed to load projects metadata:", err);
    }
  };

  // Fetch locations cascades
  const fetchLocationsForProject = async (projId) => {
    try {
      const res = await fetch(`http://localhost:8000/api/projects/${projId}/locations/`);
      if (res.ok) {
        const data = await res.json();
        setLocationsList(data);
      }
    } catch (err) {
      console.error("Failed to load locations metadata:", err);
    }
  };

  const fetchMasterData = async () => {
    setLoadingMasterData(true);
    try {
      const [projRes, locRes, catRes, langRes, buRes] = await Promise.all([
        fetch("http://localhost:8000/api/master/projects/", { credentials: "include" }),
        fetch("http://localhost:8000/api/master/locations/", { credentials: "include" }),
        fetch("http://localhost:8000/api/master/categories/", { credentials: "include" }),
        fetch("http://localhost:8000/api/master/languages/", { credentials: "include" }),
        fetch("http://localhost:8000/api/master/business-units/", { credentials: "include" }),
      ]);
      if (projRes.ok) setMasterProjects(await projRes.json());
      if (locRes.ok) setMasterLocations(await locRes.json());
      if (catRes.ok) setMasterCategories(await catRes.json());
      if (langRes.ok) setMasterLanguages(await langRes.json());
      if (buRes.ok) setMasterBusinessUnits(await buRes.json());
    } catch (err) {
      console.error("Failed to load master data:", err);
    } finally {
      setLoadingMasterData(false);
    }
  };

  const saveMasterItem = async (type, payload, id = null) => {
    const endpoints = {
      projects: "http://localhost:8000/api/master/projects/",
      locations: "http://localhost:8000/api/master/locations/",
      categories: "http://localhost:8000/api/master/categories/",
      languages: "http://localhost:8000/api/master/languages/",
    };
    const url = id ? `${endpoints[type]}${id}/` : endpoints[type];
    const method = id ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json", "X-CSRFToken": csrfToken },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setMasterEditItem(null);
      setMasterForm({});
      fetchMasterData();
      fetchProjects();
    } else {
      const err = await res.json().catch(() => ({}));
      alert(err.detail || "Save failed.");
    }
  };

  const deleteMasterItem = async (type, id) => {
    const endpoints = {
      projects: "http://localhost:8000/api/master/projects/",
      locations: "http://localhost:8000/api/master/locations/",
      categories: "http://localhost:8000/api/master/categories/",
      languages: "http://localhost:8000/api/master/languages/",
    };
    if (!confirm("Deactivate or remove this record?")) return;
    const res = await fetch(`${endpoints[type]}${id}/`, {
      method: "DELETE",
      headers: { "X-CSRFToken": csrfToken },
      credentials: "include",
    });
    if (res.ok || res.status === 204) {
      fetchMasterData();
      fetchProjects();
    }
  };

  // Fetch complaints paginated page
  const fetchComplaints = async () => {
    try {
      setLoadingComplaints(true);
      setErrorComplaints(false);

      const params = new URLSearchParams();
      params.append("page", currentPage);
      params.append("ordering", sortingState);
      if (debouncedSearch) params.append("search", debouncedSearch);
      if (filterProject) params.append("project", filterProject);
      if (filterLocation) params.append("location", filterLocation);
      if (filterCategory) params.append("category", filterCategory);
      if (filterStatus) params.append("status", filterStatus);
      if (filterLanguage) params.append("language", filterLanguage);
      if (filterBusinessUnit) params.append("business_unit", filterBusinessUnit);
      if (filterStartDate) params.append("start_date", filterStartDate);
      if (filterEndDate) params.append("end_date", filterEndDate);
      if (filterSubmissionType) params.append("submission_type", filterSubmissionType);
      if (filterSpeechStatus) params.append("transcription_status", filterSpeechStatus);
      if (filterHasAudio) params.append("has_audio", filterHasAudio);

      // Multi-dimensional chart clicks filters
      if (chartFilterStatus) params.append("status", chartFilterStatus);
      if (chartFilterCategory) params.append("category", chartFilterCategory);
      if (chartFilterProject) {
        const pMatch = projectsList.find((p) => p.name === chartFilterProject);
        if (pMatch) params.append("project", pMatch.id);
      }
      if (chartFilterLocation) {
        const lMatch = locationsList.find((l) => l.name === chartFilterLocation);
        if (lMatch) params.append("location", lMatch.id);
      }
      if (chartFilterMonth) {
        const [year, month] = chartFilterMonth.split("-");
        params.append("start_date", `${year}-${month}-01`);
        params.append("end_date", `${year}-${month}-${new Date(year, month, 0).getDate()}`);
      }

      const res = await fetch(`http://localhost:8000/api/complaints/?${params.toString()}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setComplaintsData(data);
      } else {
        setErrorComplaints(true);
      }
    } catch (err) {
      setErrorComplaints(true);
    } finally {
      setLoadingComplaints(false);
    }
  };

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      setLoadingNotifications(true);
      const res = await fetch("http://localhost:8000/api/notifications/", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
        const unread = data.filter((n) => !n.is_read).length;
        setUnreadCount(unread);
        lastUpdatedNotifCountRef.current = unread;
      }
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      setLoadingNotifications(false);
    }
  };

  // Fetch admin users (Super Admin only)
  const fetchAdminUsers = async () => {
    try {
      setLoadingAdminUsers(true);
      const res = await fetch("http://localhost:8000/api/user-management/", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setAdminUsers(data);
      }
    } catch (err) {
      console.error("User list retrieval failed:", err);
    } finally {
      setLoadingAdminUsers(false);
    }
  };

  // Fetch login audits activity logs
  const fetchActivityLogs = async () => {
    try {
      setLoadingActivityLogs(true);
      const res = await fetch("http://localhost:8000/api/activity-log/", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setActivityLogs(data);
      }
    } catch (err) {
      console.error("Activity logs failed:", err);
    } finally {
      setLoadingActivityLogs(false);
    }
  };

  // Fetch status history for detail modal
  const fetchComplaintHistory = async (complaintId) => {
    try {
      setLoadingHistory(true);
      const res = await fetch(`http://localhost:8000/api/status-history/?complaint_id=${complaintId}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setComplaintHistory(data);
      }
    } catch (err) {
      console.error("History fetch failed:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Force Refresh Trigger: manual header reload reloads EVERYTHING
  const handleForceRefresh = async () => {
    try {
      // Reload in place, preserving sorting, filters, and searches
      await Promise.all([
        fetchSummary(),
        fetchAnalytics(),
        fetchComplaints(),
        fetchNotifications(),
        fetchHealth(),
        fetchDiagnostics(diagnosticsDays)
      ]);
      if (isSuperuser) {
        fetchAdminUsers();
        fetchActivityLogs();
      }
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      console.error("Force refresh failed:", err);
    }
  };

  // Auto refresh loops triggers
  const triggerBackgroundKpiRefresh = async () => {
    // Skip refresh if a modal is open, password reset or create modal is showing, or user is editing details
    if (
      selectedComplaintRef.current || 
      showCreateUserModalRef.current || 
      showResetPasswordModalRef.current || 
      editingUserIdRef.current
    ) {
      return;
    }

    if (isRefreshingKpisRef.current || loadingSummary || loadingAnalytics) return;
    try {
      isRefreshingKpisRef.current = true;
      
      // 1. Refresh KPI cards every 60s
      const summaryRes = await fetch("http://localhost:8000/api/dashboard/summary/", { credentials: "include" });
      if (summaryRes.ok) {
        const data = await summaryRes.json();
        setSummary(data);
      }

      // 2. Refresh analytics charts ONLY when idle, Overview is active, and no active hovered/chart filter states exist
      const isChartIdle = hoveredDataRef.current === null && 
                          !chartFilterStatusRef.current && 
                          !chartFilterCategoryRef.current && 
                          !chartFilterProjectRef.current && 
                          !chartFilterLocationRef.current && 
                          !chartFilterMonthRef.current;
                          
      if (activeTabRef.current === "overview" && isChartIdle) {
        const analyticsRes = await fetch("http://localhost:8000/api/dashboard/analytics/", { credentials: "include" });
        if (analyticsRes.ok) {
          const data = await analyticsRes.json();
          setAnalytics(data);
        }
      }
      
      fetchFailedJobs();
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      console.error("KPI auto refresh failed:", err);
    } finally {
      isRefreshingKpisRef.current = false;
    }
  };

  const triggerBackgroundNotificationRefresh = async () => {
    // Skip refresh if a modal is open to avoid interrupting active administrator interactions
    if (
      selectedComplaintRef.current || 
      showCreateUserModalRef.current || 
      showResetPasswordModalRef.current || 
      editingUserIdRef.current
    ) {
      return;
    }

    if (isRefreshingNotifsRef.current) return;
    try {
      isRefreshingNotifsRef.current = true;
      // Refresh count every 30s
      const res = await fetch("http://localhost:8000/api/notifications/", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
        const unread = data.filter((n) => !n.is_read).length;
        setUnreadCount(unread);
      }
    } catch (err) {
      console.error("Notification auto refresh failed:", err);
    } finally {
      isRefreshingNotifsRef.current = false;
    }
  };

  // Mark notification read
  const handleMarkAsRead = async (id) => {
    try {
      const res = await fetch("http://localhost:8000/api/notifications/read/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrfToken
        },
        body: JSON.stringify({ id }),
        credentials: "include"
      });
      if (res.ok) {
        fetchNotifications();
      }
    } catch (err) {
      console.error("Notification update error:", err);
    }
  };

  // Mark all notifications read
  const handleMarkAllAsRead = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/notifications/read/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrfToken
        },
        body: JSON.stringify({ all: true }),
        credentials: "include"
      });
      if (res.ok) {
        fetchNotifications();
      }
    } catch (err) {
      console.error("Notification bulk read error:", err);
    }
  };

  // Create Admin user (Superuser only)
  const handleCreateAdminUser = async (e) => {
    e.preventDefault();
    setCreateUserError("");
    if (!newUsername || !newPassword || !newUserRole) {
      setCreateUserError("Fill in username and password.");
      return;
    }
    if (newPassword !== newConfirmPassword) {
      setCreateUserError("Passwords do not match.");
      return;
    }

    try {
      const res = await fetch("http://localhost:8000/api/user-management/create/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrfToken
        },
        body: JSON.stringify({
          username: newUsername,
          email: newEmail,
          password: newPassword,
          confirm_password: newConfirmPassword,
          role: newUserRole
        }),
        credentials: "include"
      });

      if (res.ok) {
        setShowCreateUserModal(false);
        setNewUsername("");
        setNewEmail("");
        setNewPassword("");
        setNewConfirmPassword("");
        setNewUserRole("Admin");
        fetchAdminUsers();
        fetchActivityLogs();
        fetchNotifications(); // reload logs
      } else {
        const err = await res.json();
        setCreateUserError(err.detail || "Validation failed.");
      }
    } catch (err) {
      setCreateUserError("Connection error.");
    }
  };

  // Reset Admin password (Superuser only)
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setResetPasswordError("");
    if (!resetNewPassword) {
      setResetPasswordError("Field is required.");
      return;
    }

    try {
      const res = await fetch("http://localhost:8000/api/user-management/reset-password/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrfToken
        },
        body: JSON.stringify({
          user_id: resetUserId,
          new_password: resetNewPassword
        }),
        credentials: "include"
      });

      if (res.ok) {
        setShowResetPasswordModal(false);
        setResetNewPassword("");
        alert("Password updated successfully.");
      } else {
        const err = await res.json();
        setResetPasswordError(err.detail || "Reset failed.");
      }
    } catch (err) {
      setResetPasswordError("Connection error.");
    }
  };

  // Toggle user active state (Lockout protection backend handled)
  const handleToggleUserActive = async (userId, newActiveState, uEmail, uIsSuper) => {
    try {
      const payload = {
        user_id: userId,
        is_active: newActiveState,
        email: uEmail,
        role: uIsSuper ? "Super Admin" : "Admin"
      };

      const res = await fetch("http://localhost:8000/api/user-management/disable/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrfToken
        },
        body: JSON.stringify(payload),
        credentials: "include"
      });

      if (res.ok) {
        fetchAdminUsers();
        fetchActivityLogs();
        fetchNotifications();
      } else {
        const err = await res.json();
        alert(err.detail || "Failed to update user active status.");
      }
    } catch (err) {
      alert("Error occurred updating account.");
    }
  };

  // Inline user edits: email and role updates
  const handleUpdateUserDetails = async (userId, targetEmail, targetRole, isActive) => {
    try {
      const payload = {
        user_id: userId,
        is_active: isActive,
        email: targetEmail,
        role: targetRole
      };
      
      const res = await fetch("http://localhost:8000/api/user-management/disable/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrfToken
        },
        body: JSON.stringify(payload),
        credentials: "include"
      });

      if (res.ok) {
        setEditingUserId(null);
        fetchAdminUsers();
        fetchNotifications();
      } else {
        const err = await res.json();
        alert(err.detail || "Failed to update user info.");
      }
    } catch (err) {
      alert("Error occurred saving details.");
    }
  };

  // Excel report exporter
  const handleExcelExport = async () => {
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.append("search", debouncedSearch);
      if (filterProject) params.append("project", filterProject);
      if (filterLocation) params.append("location", filterLocation);
      if (filterCategory) params.append("category", filterCategory);
      if (filterStatus) params.append("status", filterStatus);
      if (filterLanguage) params.append("language", filterLanguage);
      if (filterStartDate) params.append("start_date", filterStartDate);
      if (filterEndDate) params.append("end_date", filterEndDate);

      if (chartFilterStatus) params.append("status", chartFilterStatus);
      if (chartFilterCategory) params.append("category", chartFilterCategory);
      if (chartFilterProject) {
        const pMatch = projectsList.find((p) => p.name === chartFilterProject);
        if (pMatch) params.append("project", pMatch.id);
      }
      if (chartFilterLocation) {
        const lMatch = locationsList.find((l) => l.name === chartFilterLocation);
        if (lMatch) params.append("location", lMatch.id);
      }
      if (chartFilterMonth) {
        const [year, month] = chartFilterMonth.split("-");
        params.append("start_date", `${year}-${month}-01`);
        params.append("end_date", `${year}-${month}-${new Date(year, month, 0).getDate()}`);
      }

      const exportUrl = `http://localhost:8000/api/dashboard/export/?${params.toString()}`;
      const res = await fetch(exportUrl, { credentials: "include" });
      
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "complaints_export.xlsx";
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } else {
        const errorData = await res.json();
        alert(errorData.detail || "Failed to export Excel report. Limit exceeded.");
      }
    } catch (err) {
      alert("Network error occurred during report export.");
    }
  };

  // Status PATCH updates trigger
  const handleUpdateStatus = async (newStatus) => {
    if (!selectedComplaint) return;
    try {
      setUpdatingStatusState(true);
      const res = await fetch(`http://localhost:8000/api/complaints/${selectedComplaint.id}/status/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrfToken
        },
        body: JSON.stringify({ status: newStatus }),
        credentials: "include"
      });

      if (res.ok) {
        const updated = await res.json();
        setSelectedComplaint(updated);
        fetchComplaints();
        fetchSummary();
        fetchAnalytics();
        fetchNotifications();
      } else {
        const err = await res.json();
        alert(err.detail || "Failed to update status.");
      }
    } catch (err) {
      alert("Failed to update status due to a connection issue.");
    } finally {
      setUpdatingStatusState(false);
    }
  };

  // Clear filters
  const handleClearFilters = () => {
    setSearchQuery("");
    setFilterProject("");
    setFilterLocation("");
    setFilterCategory("");
    setFilterStatus("");
    setFilterLanguage("");
    setFilterBusinessUnit("");
    setFilterStartDate("");
    setFilterEndDate("");
    setFilterSubmissionType("");
    setFilterSpeechStatus("");
    setFilterHasAudio("");
    
    // Clear interactive charts filters too
    setChartFilterStatus("");
    setChartFilterCategory("");
    setChartFilterProject("");
    setChartFilterLocation("");
    setChartFilterMonth("");
    
    setCurrentPage(1);
    setSortingState("-created_at");
  };

  // Clear Chart Filters ONLY trigger
  const handleClearChartFilters = () => {
    setChartFilterStatus("");
    setChartFilterCategory("");
    setChartFilterProject("");
    setChartFilterLocation("");
    setChartFilterMonth("");
    setCurrentPage(1);
  };

  // Next / Previous Complaint inside details modal helper
  const navigateComplaintDetail = (direction) => {
    const list = (expandedChart && expandedAnalytics?.drilldown_complaints) 
      ? expandedAnalytics.drilldown_complaints 
      : complaintsData.results;

    if (!selectedComplaint || list.length === 0) return;
    const currentIndex = list.findIndex((c) => c.id === selectedComplaint.id);
    if (currentIndex === -1) return;

    let targetIndex = currentIndex;
    if (direction === "next") {
      targetIndex = currentIndex + 1;
    } else if (direction === "prev") {
      targetIndex = currentIndex - 1;
    }

    if (targetIndex >= 0 && targetIndex < list.length) {
      const nextComp = list[targetIndex];
      setSelectedComplaint(nextComp);
      setActiveDrilldownRowId(nextComp.id);
    }
  };

  // Interactive Chart clicking handlers
  const handleChartClick = (dimension, value) => {
    setCurrentPage(1);
    if (dimension === "status") {
      setChartFilterStatus(chartFilterStatus === value ? "" : value);
    } else if (dimension === "category") {
      setChartFilterCategory(chartFilterCategory === value ? "" : value);
    } else if (dimension === "project") {
      setChartFilterProject(chartFilterProject === value ? "" : value);
    } else if (dimension === "location") {
      setChartFilterLocation(chartFilterLocation === value ? "" : value);
    } else if (dimension === "month") {
      setChartFilterMonth(chartFilterMonth === value ? "" : value);
    }
  };

  // Chart Tooltips cursor handlers
  const handleChartMouseMove = (e, title, item) => {
    // Clear any pending hide timeout
    if (tooltipHideTimeoutRef.current) {
      clearTimeout(tooltipHideTimeoutRef.current);
      tooltipHideTimeoutRef.current = null;
    }

    const clientX = e.clientX;
    const clientY = e.clientY;

    const totalSummaryCount = summary?.total || 1;
    const itemPct = item.percentage !== undefined ? item.percentage : ((item.count / totalSummaryCount) * 100).toFixed(1);

    // Compile active filters list
    const activeFiltersList = [];
    if (filterProject) {
      const p = projectsList.find(x => String(x.id) === String(filterProject));
      if (p) activeFiltersList.push(`Proj: ${p.name.split(" ")[0]}`);
    }
    if (filterLocation) {
      const l = locationsList.find(x => String(x.id) === String(filterLocation));
      if (l) activeFiltersList.push(`Loc: ${l.name}`);
    }
    if (filterCategory) activeFiltersList.push(`Cat: ${filterCategory}`);
    if (filterStatus) activeFiltersList.push(`Status: ${filterStatus}`);
    if (chartFilterStatus) activeFiltersList.push(`C-Status: ${chartFilterStatus}`);
    if (chartFilterCategory) activeFiltersList.push(`C-Cat: ${chartFilterCategory}`);
    if (chartFilterProject) activeFiltersList.push(`C-Proj: ${chartFilterProject.split(" ")[0]}`);
    if (chartFilterLocation) activeFiltersList.push(`C-Loc: ${chartFilterLocation}`);
    if (chartFilterMonth) activeFiltersList.push(`C-Month: ${chartFilterMonth}`);

    // If a tooltip is already active and matches this item, update coordinates instantly (smooth trail)
    if (hoveredDataRef.current && hoveredDataRef.current.title === title) {
      setHoveredData((prev) => (prev ? { ...prev, clientX, clientY } : null));
      return;
    }

    // Clear any pending show timeout to prevent queuing multiple items
    if (tooltipShowTimeoutRef.current) {
      clearTimeout(tooltipShowTimeoutRef.current);
    }

    // Delay appearing by 100ms
    tooltipShowTimeoutRef.current = setTimeout(() => {
      setHoveredData({
        title,
        total: item.count,
        percentage: itemPct,
        category: item.category || item.status || item.project || item.location || item.month || "N/A",
        activeFilters: activeFiltersList,
        counts: {
          Pending: item.Pending || 0,
          "In Progress": item["In Progress"] || 0,
          Completed: item.Completed || 0,
          Resolved: item.Resolved || 0,
          Rejected: item.Rejected || 0
        },
        clientX,
        clientY
      });
      tooltipShowTimeoutRef.current = null;
    }, 100);
  };

  const handleChartMouseLeave = () => {
    // Cancel show timeout if mouse moved out before it triggered
    if (tooltipShowTimeoutRef.current) {
      clearTimeout(tooltipShowTimeoutRef.current);
      tooltipShowTimeoutRef.current = null;
    }

    // Cancel any previous hide timeout
    if (tooltipHideTimeoutRef.current) {
      clearTimeout(tooltipHideTimeoutRef.current);
    }

    // Delay hide by 100ms to allow hover transitions
    tooltipHideTimeoutRef.current = setTimeout(() => {
      setHoveredData(null);
      tooltipHideTimeoutRef.current = null;
    }, 100);
  };

  // Viewport-safe coordinates calculation for the tooltip
  const getTooltipStyle = () => {
    if (!hoveredData) return {};
    
    const tooltipWidth = 180;
    const tooltipHeight = 170;
    
    let left = hoveredData.clientX;
    let top = hoveredData.clientY - 15;
    let transform = "translate(-50%, -100%)";
    
    // Check left boundary
    if (hoveredData.clientX < (tooltipWidth / 2 + 10)) {
      left = hoveredData.clientX + 15;
      transform = "translate(0, -50%)";
    }
    // Check right boundary
    else if ((window.innerWidth - hoveredData.clientX) < (tooltipWidth / 2 + 10)) {
      left = hoveredData.clientX - 15;
      transform = "translate(-100%, -50%)";
    }
    
    // Check top boundary
    if (hoveredData.clientY < (tooltipHeight + 20)) {
      top = hoveredData.clientY + 15;
      if (transform.includes("0,") || transform === "translate(0, -50%)") {
        transform = "translate(0, 15px)";
      } else if (transform.includes("-100%,") || transform === "translate(-100%, -50%)") {
        transform = "translate(-100%, 15px)";
      } else {
        transform = "translate(-50%, 15px)";
      }
    }
    
    return {
      position: "fixed",
      left: `${left}px`,
      top: `${top}px`,
      transform: transform,
      zIndex: 9999,
      pointerEvents: "none"
    };
  };

  // Sorting columns header toggle
  const handleSortClick = (field) => {
    if (sortingState === field) {
      setSortingState(`-${field}`);
    } else {
      setSortingState(field);
    }
    setCurrentPage(1);
  };

  // Dynamic Audio time format helpers
  const formatAudioTime = (timeInSeconds) => {
    if (isNaN(timeInSeconds)) return "00:00";
    const mins = Math.floor(timeInSeconds / 60);
    const secs = Math.floor(timeInSeconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Audio Playback Custom Triggers
  const handleAudioPlayToggle = () => {
    if (audioElRef.current) {
      if (audioIsPlaying) {
        audioElRef.current.pause();
      } else {
        audioElRef.current.play();
      }
    }
  };

  const handleAudioTimeUpdate = () => {
    if (audioElRef.current) {
      setAudioCurrentTime(audioElRef.current.currentTime);
    }
  };

  const handleAudioLoadedMetadata = () => {
    if (audioElRef.current) {
      setAudioDuration(audioElRef.current.duration);
    }
  };

  const handleAudioSeek = (e) => {
    const time = parseFloat(e.target.value);
    if (audioElRef.current) {
      audioElRef.current.currentTime = time;
      setAudioCurrentTime(time);
    }
  };

  // Styling and display Helpers
  const getBadgeStyle = (statusVal) => {
    switch (statusVal) {
      case "Pending":
        return "ds-badge ds-badge-pending";
      case "In Progress":
        return "ds-badge ds-badge-inprogress";
      case "Completed":
        return "ds-badge ds-badge-completed";
      case "Resolved":
        return "ds-badge ds-badge-resolved";
      case "Rejected":
        return "ds-badge ds-badge-rejected";
      default:
        return "ds-badge ds-badge-info";
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "complaint_created": return "📋";
      case "complaint_updated": return "⚡";
      case "user_created": return "👤";
      case "user_disabled": return "🚫";
      case "login": return "🔑";
      case "logout": return "🚪";
      default: return "🔔";
    }
  };

  // Formatting seconds into hours/mins text
  const formatSecondsDuration = (secs) => {
    if (secs === null || secs === undefined) return "-";
    if (secs < 60) return `${secs}s`;
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hours}h ${remMins}m`;
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-300 font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin text-3xl">⏳</div>
          <span className="text-sm font-semibold tracking-wider uppercase animate-pulse">
            Verifying Admin Session...
          </span>
        </div>
      </div>
    );
  }

  // LOGIN BARRIER SCREEN
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 bg-gradient-to-tr from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center px-4 font-sans select-none">
        <div className="w-full max-w-[420px] bg-slate-900/65 backdrop-blur-xl border-2 border-slate-800 shadow-2xl p-8 flex flex-col gap-6 relative">
          <div className="absolute -top-3 left-4 bg-amber-500 text-slate-950 font-black text-xs px-2.5 py-0.5 uppercase tracking-wider border-2 border-slate-950 shadow-sm">
            Control Room auth
          </div>

          <div className="flex flex-col text-center mt-2">
            <h1 className="text-2xl font-black tracking-tight text-white uppercase">
              Welfare Portal Dashboard
            </h1>
            <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">
              Administrative Login
            </p>
          </div>

          {authError && (
            <div className="bg-red-500/10 border border-red-500/40 text-red-400 text-sm font-semibold p-3 text-center rounded-sm">
              ⚠ {authError}
            </div>
          )}

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase text-slate-300 tracking-wider">
                Username / User ID
              </label>
              <input
                type="text"
                required
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-white p-3 font-semibold text-sm outline-none focus:border-amber-500 transition-colors"
                placeholder="e.g. admin"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase text-slate-300 tracking-wider">
                Security Password
              </label>
              <input
                type="password"
                required
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-white p-3 font-semibold text-sm outline-none focus:border-amber-500 transition-colors"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loggingIn}
              className={`w-full py-3.5 mt-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-sm uppercase tracking-wider border-2 border-slate-950 active:translate-x-0.5 active:translate-y-0.5 transition-transform duration-100 flex items-center justify-center ${
                loggingIn ? "cursor-not-allowed opacity-70" : "cursor-pointer"
              }`}
            >
              {loggingIn ? "Authenticating Session..." : "⚡ Establish Session"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // MAIN ADMIN DASHBOARD
  return (
    <div className={`min-h-screen font-sans flex flex-col relative overflow-x-hidden admin-dashboard-container theme-${theme}`}>
      {/* Theme Variable Overlay Style */}
      
      {/* Dynamic Header */}
      <header className="dashboard-header flex items-center justify-between shadow-md z-30">
        <div className="flex items-center gap-3">
          <span className="text-2xl">👷‍♂️</span>
          <div>
            <h1 className="dashboard-title font-black tracking-tight uppercase leading-none text-white">
              Worker Welfare Portal
            </h1>
            <p className="dashboard-subtitle font-bold text-slate-400 mt-1 uppercase tracking-wider">
              Management Control Dashboard
            </p>
          </div>
        </div>

        {/* Global Manual Force Refresh, Sync Clock and Notifications bell badge */}
        <div className="flex items-center gap-6">
          
          <button
            onClick={handleForceRefresh}
            className="text-xs bg-slate-950 hover:bg-slate-850 border border-slate-850 hover:border-amber-500/40 text-amber-400 px-3.5 py-1.5 font-bold uppercase transition-all flex items-center gap-2 cursor-pointer shadow-sm active:translate-x-0.5 active:translate-y-0.5"
            title="Force refresh all operational data"
          >
            🔄 Force Refresh
          </button>

          {/* Notifications Bell badge */}
          <button
            onClick={() => setShowNotificationsDrawer(!showNotificationsDrawer)}
            className="relative bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 p-2 text-xs font-black uppercase tracking-wider cursor-pointer flex items-center gap-1.5 transition-all"
          >
            🔔 Notifications
            {unreadCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-rose-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black border-2 border-slate-950 animate-bounce shadow-[0_0_8px_rgba(225,29,72,0.6)]">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Phase 5.6 Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3.5 py-1.5 text-xs font-black uppercase tracking-wider cursor-pointer flex items-center gap-1.5 transition-all shadow-sm active:translate-y-0.5"
          >
            {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
          </button>

          {systemHealth && (
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-2.5 py-1.5 text-[9px] font-black uppercase tracking-wider text-slate-400">
              <span className={`w-1.5 h-1.5 rounded-full ${systemHealth.status === "healthy" ? "bg-emerald-400 animate-pulse" : "bg-rose-500 animate-pulse"}`} />
              Health: <span className={systemHealth.status === "healthy" ? "text-emerald-400" : "text-rose-450"}>{systemHealth.status}</span>
            </div>
          )}

          <div className="flex flex-col text-right">
            <span className="text-xs font-black text-white">👤 {adminUsername} {isSuperuser && <span className="text-[8px] bg-red-950 border border-red-800 text-red-400 font-extrabold px-1 rounded-sm uppercase ml-1">Super</span>}</span>
            <span className="text-[10px] font-bold text-slate-400">
              Synced: <span className="font-mono text-amber-400">{lastUpdated || "Never"}</span>
            </span>
          </div>

          <button
            onClick={handleLogout}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-rose-950/60 hover:text-rose-400 border border-slate-700 hover:border-rose-800 text-xs font-bold uppercase transition-all cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Tabs Navigation */}
      <div className="dashboard-nav-bar px-8 flex items-center justify-between z-10">
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setActiveTab("overview")}
            className={`nav-tab px-5 py-3 text-xs font-black uppercase tracking-wider border-t-2 transition-all cursor-pointer ${
              activeTab === "overview"
                ? "bg-slate-900 border-blue-500 text-white"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            📊 Analytics & KPIs
          </button>
          
          <button
            onClick={() => setActiveTab("complaints")}
            className={`nav-tab px-5 py-3 text-xs font-black uppercase tracking-wider border-t-2 transition-all cursor-pointer ${
              activeTab === "complaints"
                ? "bg-slate-900 border-blue-500 text-white"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            📋 Complaint Tickets ({complaintsData.count})
          </button>

          <button
            onClick={() => setActiveTab("master-data")}
            className={`nav-tab px-5 py-3 text-sm font-extrabold uppercase tracking-wider border-t-2 transition-all cursor-pointer ${
              activeTab === "master-data"
                ? "bg-slate-900 border-blue-500 text-white"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            🗂️ Master Data
          </button>

          <button
            onClick={() => setActiveTab("settings")}
            className={`nav-tab px-5 py-3 text-sm font-extrabold uppercase tracking-wider border-t-2 transition-all cursor-pointer ${
              activeTab === "settings"
                ? "bg-slate-900 border-blue-500 text-white"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            ⚙ Settings & System
          </button>
        </div>
      </div>

      {/* Primary Area */}
      <main className="flex-1 px-8 py-6 flex flex-col gap-8 overflow-y-auto z-10 dashboard-main-scroll dashboard-main">
        
        {/* TAB 1: OVERVIEW & ANALYTICS */}
        {activeTab === "overview" && (
          <div className="flex flex-col gap-8 w-full desktop-shell">
            
            {/* KPI Cards Row */}
            {/* KPI Cards Row */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {loadingSummary ? (
                <>
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="kpi-card bg-slate-900/60 border border-slate-800 p-4 flex flex-col justify-between relative shadow-lg min-h-[100px] animate-pulse">
                      <span className="h-3 w-16 bg-slate-800 rounded"></span>
                      <span className="h-8 w-12 bg-slate-800 rounded mt-2"></span>
                    </div>
                  ))}
                </>
              ) : errorSummary ? (
                <div className="col-span-6 bg-red-500/10 border border-red-500/40 text-red-400 text-sm font-semibold p-4 text-center">
                  Failed to load operational statistics.
                </div>
              ) : (
                <>
                  <AnimatedKpi value={summary?.total} label="Total logged" colorClass="text-slate-400" rank="0" />
                  <AnimatedKpi value={summary?.pending} label="Pending Review" colorClass="text-amber-500" rank="1" />
                  <AnimatedKpi value={summary?.in_progress} label="In Progress" colorClass="text-indigo-500" rank="2" />
                  <AnimatedKpi value={summary?.completed} label="Completed" colorClass="text-emerald-500" rank="3" />
                  <AnimatedKpi value={summary?.resolved} label="Resolved" colorClass="text-cyan-500" rank="4" />
                  <AnimatedKpi value={summary?.rejected} label="Rejected" colorClass="text-rose-500" rank="5" />
                </>
              )}
            </div>

            {/* Dynamic Executive Intelligence Cards */}
            <div className="enterprise-card flex flex-col gap-5 p-6">
              <h3 className="section-heading font-extrabold uppercase tracking-wide text-amber-500 flex items-center gap-2">
                🧠 Dashboard Intelligence & Insights
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
                
                {/* 1. Resolution Rate */}
                <div className="intelligence-card enterprise-card rounded-lg border p-5 flex flex-col justify-between min-h-[90px]">
                  <span className="font-extrabold uppercase text-base text-slate-500">Resolution Rate %</span>
                  {loadingSummary ? (
                    <span className="text-sm font-bold text-slate-600 tracking-wider">Loading...</span>
                  ) : (
                    <span className="text-lg font-black text-emerald-400 mt-1"><AnimatedValue value={summary?.resolution_rate} isPercent={true} /></span>
                  )}
                </div>

                {/* 2. Pending Rate */}
                <div className="intelligence-card enterprise-card rounded-lg border p-5 flex flex-col justify-between min-h-[90px]">
                  <span className="font-black uppercase text-slate-500">Pending Rate %</span>
                  {loadingSummary ? (
                    <span className="text-sm font-bold text-slate-600 tracking-wider">Loading...</span>
                  ) : (
                    <span className="text-lg font-black text-amber-400 mt-1"><AnimatedValue value={summary?.pending_rate} isPercent={true} /></span>
                  )}
                </div>

                {/* 3. Average Resolution Time */}
                <div className="intelligence-card enterprise-card rounded-lg border p-5 flex flex-col justify-between min-h-[90px]">
                  <span className="font-black uppercase text-slate-500">Average Resolution Time</span>
                  {loadingSummary ? (
                    <span className="text-sm font-bold text-slate-600 tracking-wider">Loading...</span>
                  ) : (
                    <span className="text-lg font-black text-cyan-400 mt-1">{formatSecondsDuration(summary?.avg_resolution_time)}</span>
                  )}
                </div>

                {/* 4. Complaints Last 7 Days */}
                <div className="intelligence-card enterprise-card rounded-lg border p-5 flex flex-col justify-between min-h-[90px]">
                  <span className="font-black uppercase text-slate-500">Complaints (Last 7 Days)</span>
                  {loadingSummary ? (
                    <span className="text-sm font-bold text-slate-600 tracking-wider">Loading...</span>
                  ) : (
                    <span className="text-lg font-black text-white mt-1">{summary?.complaints_last_7_days} tickets</span>
                  )}
                </div>

                {/* 5. Most Reported Category */}
                <div className="intelligence-card enterprise-card rounded-lg border p-5 flex flex-col justify-between min-h-[90px]">
                  <span className="font-black uppercase text-slate-500">Most Reported Category</span>
                  {loadingSummary ? (
                    <span className="text-sm font-bold text-slate-600 tracking-wider">Loading...</span>
                  ) : (
                    <span className="text-sm font-black text-amber-400 mt-1 uppercase truncate">{summary?.intelligence?.most_reported_category}</span>
                  )}
                </div>

                {/* 6. Most Affected Project */}
                <div className="intelligence-card enterprise-card rounded-lg border p-5 flex flex-col justify-between min-h-[90px]">
                  <span className="font-black uppercase text-slate-500">Most Affected Project</span>
                  {loadingSummary ? (
                    <span className="text-sm font-bold text-slate-600 tracking-wider">Loading...</span>
                  ) : (
                    <span className="text-sm font-black text-rose-400 mt-1 truncate">{summary?.intelligence?.most_affected_project}</span>
                  )}
                </div>

                {/* 7. Most Active Project */}
                <div className="intelligence-card enterprise-card rounded-lg border p-5 flex flex-col justify-between min-h-[90px]">
                  <span className="font-black uppercase text-slate-500">Most Active Project (Pending)</span>
                  {loadingSummary ? (
                    <span className="text-sm font-bold text-slate-600 tracking-wider">Loading...</span>
                  ) : (
                    <span className="text-sm font-black text-indigo-400 mt-1 truncate">{summary?.intelligence?.most_active_project}</span>
                  )}
                </div>

                {/* 8. Total Today / This Month */}
                <div className="intelligence-card enterprise-card rounded-lg border p-5 flex flex-col justify-between min-h-[90px]">
                  <span className="font-black uppercase text-slate-500">Complaints Volume (Today / Month)</span>
                  {loadingSummary ? (
                    <span className="text-sm font-bold text-slate-600 tracking-wider">Loading...</span>
                  ) : (
                    <span className="text-sm font-black text-white mt-1">
                      {summary?.intelligence?.total_today} today / {summary?.intelligence?.total_this_month} month
                    </span>
                  )}
                </div>

              </div>
            </div>

            {/* Speech Dashboard — business metrics only */}
            <div className="dashboard-card enterprise-card rounded-xl border p-6 shadow-lg flex flex-col gap-5">
              <h3 className="text-xl font-extrabold uppercase tracking-wide text-cyan-400 flex items-center gap-2">
                🎙️ Speech Dashboard
              </h3>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="intelligence-card enterprise-card rounded-lg border p-5 flex flex-col gap-2 min-h-[100px]">
                  <span className="font-extrabold uppercase text-slate-500 text-base">Total Audio Complaints</span>
                  <span className="text-3xl font-black text-white">{loadingSummary ? "—" : summary?.speech_stats?.total_audio ?? 0}</span>
                </div>
                <div className="intelligence-card enterprise-card rounded-lg border p-5 flex flex-col gap-2 min-h-[100px]">
                  <span className="font-extrabold uppercase text-slate-500 text-base">Completed Reviews</span>
                  <span className="text-3xl font-black text-emerald-400">{loadingSummary ? "—" : summary?.speech_stats?.completed_audio ?? 0}</span>
                </div>
                <div className="intelligence-card enterprise-card rounded-lg border p-5 flex flex-col gap-2 min-h-[100px]">
                  <span className="font-extrabold uppercase text-slate-500 text-base">Failed Reviews</span>
                  <span className="text-3xl font-black text-rose-400">{loadingSummary ? "—" : summary?.speech_stats?.failed_audio ?? 0}</span>
                </div>
                <div className="intelligence-card enterprise-card rounded-lg border p-5 flex flex-col gap-2 min-h-[100px]">
                  <span className="font-extrabold uppercase text-slate-500 text-base">Average Confidence</span>
                  <span className="text-3xl font-black text-cyan-400">{loadingSummary ? "—" : `${summary?.speech_stats?.avg_confidence ?? 0}%`}</span>
                </div>
                <div className="intelligence-card enterprise-card rounded-lg border p-5 flex flex-col gap-2 min-h-[100px]">
                  <span className="font-extrabold uppercase text-slate-500 text-base">Success Rate</span>
                  <span className="text-3xl font-black text-emerald-400">{loadingSummary ? "—" : `${summary?.speech_stats?.success_rate ?? 0}%`}</span>
                </div>
                <div className="intelligence-card enterprise-card rounded-lg border p-5 flex flex-col gap-2 min-h-[100px] col-span-2 lg:col-span-1">
                  <span className="font-extrabold uppercase text-slate-500 text-base">Top Languages</span>
                  <div className="flex flex-col gap-1 mt-1">
                    {(summary?.speech_stats?.top_languages || []).slice(0, 3).map((lang) => (
                      <span key={lang.code} className="text-sm font-bold text-slate-200 uppercase">
                        {languageNames[lang.code?.toLowerCase()] || lang.code}: <span className="text-cyan-400">{lang.count}</span>
                      </span>
                    ))}
                    {!loadingSummary && (!summary?.speech_stats?.top_languages || summary.speech_stats.top_languages.length === 0) && (
                      <span className="text-sm text-slate-500">No data</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Failed Transcription Jobs list */}
            <div className="enterprise-card flex flex-col gap-5 p-6">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <h3 className="section-heading font-extrabold uppercase tracking-wide text-rose-500">
                  ⚠️ Failed Transcription Jobs Queue
                </h3>
                {failedSelectedIds.length > 0 && (
                  <button
                    onClick={handleBulkReprocess}
                    disabled={isReprocessingBulk}
                    className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-3 py-1 text-[11px] font-black uppercase border-2 border-slate-950 active-press rounded-none flex items-center gap-1"
                  >
                    {isReprocessingBulk ? "Processing..." : `🔄 Bulk Reprocess (${failedSelectedIds.length})`}
                  </button>
                )}
              </div>

              {loadingSummary ? (
                <div className="text-xs text-slate-500 uppercase tracking-widest text-center py-4">Loading failed queue...</div>
              ) : (
                <div className="max-h-[220px] overflow-y-auto border border-slate-800 bg-slate-950 text-xs">
                  {failedJobsList.length === 0 ? (
                    <div className="p-4 text-center text-slate-500 uppercase font-black">No failed transcription jobs found!</div>
                  ) : (
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 font-extrabold uppercase select-none">
                          <th className="p-2.5 w-10 text-center">
                            <input
                              type="checkbox"
                              checked={failedJobsList.length > 0 && failedSelectedIds.length === failedJobsList.length}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFailedSelectedIds(failedJobsList.map(c => c.id));
                                } else {
                                  setFailedSelectedIds([]);
                                }
                              }}
                              className="rounded border-slate-850"
                            />
                          </th>
                          <th className="p-2.5">Reference #</th>
                          <th className="p-2.5">Language</th>
                          <th className="p-2.5">Submission Type</th>
                          <th className="p-2.5">Category</th>
                          <th className="p-2.5">Error Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {failedJobsList.map((complaint) => {
                          const isChecked = failedSelectedIds.includes(complaint.id);
                          return (
                            <tr key={complaint.id} className="border-b border-slate-900 hover:bg-slate-900/40 text-slate-300 font-bold">
                              <td className="p-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setFailedSelectedIds(prev => [...prev, complaint.id]);
                                    } else {
                                      setFailedSelectedIds(prev => prev.filter(id => id !== complaint.id));
                                    }
                                  }}
                                  className="rounded border-slate-850"
                                />
                              </td>
                              <td className="p-2">
                                <button
                                  onClick={() => setSelectedComplaint(complaint)}
                                  className="text-cyan-400 hover:underline font-extrabold"
                                >
                                  {complaint.reference_number}
                                </button>
                              </td>
                              <td className="p-2 uppercase font-mono">{complaint.language}</td>
                              <td className="p-2 uppercase font-mono">{complaint.submission_type}</td>
                              <td className="p-2 uppercase font-mono">{complaint.category}</td>
                              <td className="p-2 text-rose-400 font-medium truncate max-w-[200px]" title={complaint.transcription_error}>
                                {complaint.transcription_error || "Unknown Failure"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>

            {errorSummary && (
              <div className="bg-red-500/10 border border-red-500/40 text-red-400 text-xs font-bold p-3 flex justify-between items-center rounded-sm">
                <span>Failed to load summary stats.</span>
                <button
                  onClick={fetchSummary}
                  className="bg-red-500 hover:bg-red-600 text-slate-950 px-2 py-1 uppercase text-[10px] font-black border border-slate-950"
                >
                  Retry
                </button>
              </div>
            )}

            {/* SVG Charts Area */}
            {loadingAnalytics ? (
              <ChartSkeleton />
            ) : errorAnalytics ? (
              <div className="bg-red-500/10 border border-red-500/40 text-red-400 font-bold p-6 flex flex-col gap-3 items-center justify-center rounded-sm min-h-[300px]">
                <span>Failed to load analytics distributions.</span>
                <button
                  onClick={fetchAnalytics}
                  className="bg-red-500 hover:bg-red-600 text-slate-950 px-4 py-2 uppercase text-xs font-black border-2 border-slate-950"
                >
                  Retry Loading Charts
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative">
                
                {/* 1. Category Distribution: Vertical Bar Chart */}
                <div
                  className="dashboard-card enterprise-card chart-card rounded-2xl p-6 flex flex-col gap-5 relative cursor-pointer transition-all duration-200"
                  onClick={(e) => {
                    if (e.target.closest("button") || e.target.closest("a") || e.target.closest("g") || e.target.closest(".chart-legend")) return;
                    handleExpandChart("category");
                  }}
                >
                  <div className="flex justify-between items-center w-full">
                    <h3 className="section-heading font-extrabold uppercase tracking-wide" style={{color:"var(--text-primary)"}}>
                      Complaint Category Distribution
                    </h3>
                    <button
                      onClick={() => handleExpandChart("category")}
                      className="btn-enterprise btn-enterprise-secondary text-sm font-bold uppercase cursor-pointer"
                    >
                      Expand
                    </button>
                  </div>
                  <div className="w-full flex-1 flex items-end justify-center" style={{minHeight:"320px",maxHeight:"380px"}}>
                    {analytics?.category_distribution?.length === 0 ? (
                      <div className="w-full h-full flex items-center justify-center text-slate-500 font-bold text-xs uppercase">
                        No category data registered
                      </div>
                    ) : (
                      <svg viewBox="0 0 400 220" className="w-full h-full" style={{overflow:"visible"}}>
                        <rect width="400" height="220" fill="transparent" onClick={() => handleExpandChart("category")} className="cursor-pointer" />
                        <line x1="30" y1="20" x2="380" y2="20" stroke="var(--border)" strokeWidth="1" strokeDasharray="3" />
                        <line x1="30" y1="85" x2="380" y2="85" stroke="var(--border)" strokeWidth="1" strokeDasharray="3" />
                        <line x1="30" y1="150" x2="380" y2="150" stroke="var(--border)" strokeWidth="1" strokeDasharray="3" />
                        <line x1="30" y1="150" x2="380" y2="150" stroke="#64748b" strokeWidth="2" />
                        
                        {(() => {
                          const items = analytics.category_distribution;
                          const maxCount = Math.max(...items.map(item => item.count), 1);
                          const barWidth = Math.min(32, 300 / items.length);
                          const gap = (350 - (barWidth * items.length)) / (items.length + 1);

                          return items.map((item, index) => {
                            const barHeight = (item.count / maxCount) * 120;
                            const x = 30 + gap + index * (barWidth + gap);
                            const y = 150 - barHeight;
                            const isFiltered = chartFilterCategory === item.category;
                            const labelX = x + barWidth / 2;

                            return (
                              <g
                                key={item.category}
                                className="group cursor-pointer"
                                onClick={() => handleChartClick("category", item.category)}
                                onMouseMove={(e) => handleChartMouseMove(e, `Category: ${item.category}`, item)}
                                onMouseLeave={handleChartMouseLeave}
                              >
                                <rect
                                  x={x}
                                  y={y}
                                  width={barWidth}
                                  height={Math.max(barHeight, 2)}
                                  rx="3"
                                  fill={isFiltered ? "#ea580c" : "#f59e0b"}
                                  style={{transition:"fill 0.2s, filter 0.2s"}}
                                  onMouseEnter={e => { e.currentTarget.style.filter = "brightness(1.15)"; }}
                                  onMouseLeave={e => { e.currentTarget.style.filter = ""; handleChartMouseLeave(); }}
                                />
                                <text
                                  x={x + barWidth / 2}
                                  y={y - 5}
                                  textAnchor="middle"
                                  fill="var(--text-secondary)"
                                  fontSize="11"
                                  fontWeight="700"
                                >
                                  {item.count}
                                </text>
                                <text
                                  x={labelX}
                                  y="168"
                                  textAnchor="end"
                                  fill={isFiltered ? "#f97316" : "var(--text-muted)"}
                                  fontSize="10"
                                  fontWeight="700"
                                  className="uppercase"
                                  transform={`rotate(-40, ${labelX}, 168)`}
                                >
                                  {item.category.length > 10 ? item.category.slice(0,9)+"…" : item.category}
                                </text>
                              </g>
                            );
                          });
                        })()}
                      </svg>
                    )}
                  </div>
                </div>
 
                {/* 2. Status Distribution: Donut Chart */}
                <div
                  className="dashboard-card enterprise-card chart-card rounded-2xl p-6 flex flex-col gap-5 relative cursor-pointer transition-all duration-200"
                  onClick={(e) => {
                    if (e.target.closest("button") || e.target.closest("a") || e.target.closest("path") || e.target.closest(".donut-legend")) return;
                    handleExpandChart("status");
                  }}
                >
                  <div className="flex justify-between items-center w-full">
                    <h3 className="section-heading font-extrabold uppercase tracking-wide" style={{color:"var(--text-primary)"}}>
                      Complaint Status Distribution
                    </h3>
                    <button
                      onClick={() => handleExpandChart("status")}
                      className="btn-enterprise btn-enterprise-secondary text-sm font-bold uppercase cursor-pointer"
                    >
                      Expand
                    </button>
                  </div>
                  
                  <div className="donut-chart-panel flex items-center justify-center flex-col xl:flex-row gap-8 py-4">
                    <DonutChart
                      data={analytics?.status_distribution}
                      filterStatus={chartFilterStatus}
                      onSliceClick={(status) => handleChartClick("status", status)}
                      onSliceMouseMove={handleChartMouseMove}
                      onSliceMouseLeave={handleChartMouseLeave}
                    />
                    <DonutLegend
                      data={analytics?.status_distribution}
                      filterStatus={chartFilterStatus}
                      onItemClick={(status) => handleChartClick("status", status)}
                    />
                  </div>
                </div>
 
                {/* 3. Project Distribution: Horizontal Bar Chart */}
                <div
                  className="dashboard-card enterprise-card chart-card rounded-2xl p-6 flex flex-col gap-5 relative cursor-pointer transition-all duration-200"
                  onClick={(e) => {
                    if (e.target.closest("button") || e.target.closest("a") || e.target.closest("g") || e.target.closest(".chart-legend")) return;
                    handleExpandChart("project");
                  }}
                >
                  <div className="flex justify-between items-center w-full">
                    <h3 className="section-heading font-extrabold uppercase tracking-wide" style={{color:"var(--text-primary)"}}>
                      Complaints by Project
                    </h3>
                    <button
                      onClick={() => handleExpandChart("project")}
                      className="btn-enterprise btn-enterprise-secondary text-sm font-bold uppercase cursor-pointer"
                    >
                      Expand
                    </button>
                  </div>
                  
                  <div className="w-full flex-1 flex items-center justify-center" style={{minHeight:"280px",maxHeight:"360px"}}>
                    {analytics?.project_distribution?.length === 0 ? (
                      <div className="w-full h-full flex items-center justify-center text-slate-500 font-bold text-xs uppercase">
                        No projects registered
                      </div>
                    ) : (
                      <svg viewBox="0 0 520 220" className="w-full h-full">
                        <rect width="520" height="220" fill="transparent" onClick={() => handleExpandChart("project")} className="cursor-pointer" />
                        <line x1="155" y1="200" x2="500" y2="200" stroke="var(--border)" strokeWidth="1" />
                        <line x1="325" y1="10" x2="325" y2="200" stroke="var(--border)" strokeWidth="1" strokeDasharray="3" />
                        <line x1="500" y1="10" x2="500" y2="200" stroke="var(--border)" strokeWidth="1" strokeDasharray="3" />

                        {(() => {
                          const topProjects = analytics.project_distribution.slice(0, 6);
                          const maxCount = Math.max(...topProjects.map(item => item.count), 1);
                          const barHeight = 24;
                          const totalBarsH = barHeight * topProjects.length;
                          const totalGapH = 185 - totalBarsH;
                          const gap = totalGapH / (topProjects.length + 1);

                          return topProjects.map((item, index) => {
                            const barWidth = (item.count / maxCount) * 330;
                            const y = 15 + gap + index * (barHeight + gap);
                            const isFiltered = chartFilterProject === item.project;
                            // Smart label: trim to fit left column
                            const maxLabelChars = 20;
                            const label = item.project.length > maxLabelChars
                              ? item.project.slice(0, maxLabelChars - 1) + "…"
                              : item.project;

                            return (
                              <g
                                key={item.project}
                                className="group cursor-pointer"
                                onClick={() => handleChartClick("project", item.project)}
                                onMouseMove={(e) => handleChartMouseMove(e, `Project: ${item.project}`, item)}
                                onMouseLeave={handleChartMouseLeave}
                              >
                                <title>{item.project}</title>
                                <text
                                  x="150"
                                  y={y + 15}
                                  textAnchor="end"
                                  fill={isFiltered ? "#F97316" : "var(--text-secondary)"}
                                  fontSize="10"
                                  fontWeight="600"
                                >
                                  {label}
                                </text>
                                <rect
                                  x="155"
                                  y={y}
                                  width={Math.max(barWidth, 2)}
                                  height={barHeight}
                                  rx="3"
                                  fill={isFiltered ? "#EA580C" : "#6366F1"}
                                  style={{transition:"fill 0.2s, filter 0.2s"}}
                                  onMouseEnter={e => { e.currentTarget.style.filter = "brightness(1.15)"; }}
                                  onMouseLeave={e => { e.currentTarget.style.filter = ""; handleChartMouseLeave(); }}
                                />
                                <text
                                  x={155 + barWidth + 7}
                                  y={y + 15}
                                  fill="var(--text-secondary)"
                                  fontSize="10"
                                  fontWeight="700"
                                >
                                  {item.count}
                                </text>
                              </g>
                            );
                          });
                        })()}
                      </svg>
                    )}
                  </div>
                </div>
 
                {/* 4. Monthly Complaint Trend: Line Chart */}
                <div
                  className="dashboard-card enterprise-card chart-card rounded-2xl p-6 flex flex-col gap-5 relative cursor-pointer transition-all duration-200"
                  onClick={(e) => {
                    if (e.target.closest("button") || e.target.closest("a") || e.target.closest("g") || e.target.closest(".chart-legend")) return;
                    handleExpandChart("trend");
                  }}
                >
                  <div className="flex justify-between items-center w-full">
                    <h3 className="section-heading font-extrabold uppercase tracking-wide" style={{color:"var(--text-primary)"}}>
                      Monthly Complaint Trend
                    </h3>
                    <button
                      onClick={() => handleExpandChart("trend")}
                      className="btn-enterprise btn-enterprise-secondary text-sm font-bold uppercase cursor-pointer"
                    >
                      Expand
                    </button>
                  </div>
                  
                  <div className="w-full flex-1 flex items-end justify-center" style={{minHeight:"280px",maxHeight:"360px"}}>
                    {analytics?.monthly_trend?.length === 0 ? (
                      <div className="w-full h-full flex items-center justify-center text-slate-500 font-bold text-xs uppercase">
                        No monthly records
                      </div>
                    ) : (
                      <svg viewBox="0 0 400 200" className="w-full h-full">
                        <rect width="400" height="200" fill="transparent" onClick={() => handleExpandChart("trend")} className="cursor-pointer" />
                        <defs>
                          <linearGradient id="gradient-area" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.35" />
                            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>
 
                        <line x1="30" y1="20" x2="380" y2="20" stroke="var(--border)" strokeWidth="1" strokeDasharray="3" />
                        <line x1="30" y1="85" x2="380" y2="85" stroke="var(--border)" strokeWidth="1" strokeDasharray="3" />
                        <line x1="30" y1="150" x2="380" y2="150" stroke="var(--border)" strokeWidth="1" strokeDasharray="3" />
                        <line x1="30" y1="150" x2="380" y2="150" stroke="#64748b" strokeWidth="2" />
                        
                        {(() => {
                          const maxCount = Math.max(...analytics.monthly_trend.map(item => item.count), 1);
                          const countPoints = analytics.monthly_trend.length;
                          const plotWidth = 330;
                          
                          const coords = analytics.monthly_trend.map((item, index) => {
                            const x = 30 + (countPoints > 1 ? index * (plotWidth / (countPoints - 1)) : plotWidth / 2);
                            const y = 150 - (item.count / maxCount) * 120;
                            return { x, y, count: item.count, label: item.month, data: item };
                          });
 
                          const linePath = coords.map((pt, i) => `${i === 0 ? "M" : "L"} ${pt.x} ${pt.y}`).join(" ");
                          const areaPath = coords.length > 0 
                            ? `${linePath} L ${coords[coords.length - 1].x} 150 L ${coords[0].x} 150 Z` 
                            : "";
 
                          return (
                            <>
                              {areaPath && <path d={areaPath} fill="url(#gradient-area)" />}
                              {linePath && <path d={linePath} fill="none" stroke="#06b6d4" strokeWidth="2.5" />}
                              
                              {coords.map((pt) => {
                                const isFiltered = chartFilterMonth === pt.label;
                                return (
                                  <g
                                    key={pt.label}
                                    className="group cursor-pointer"
                                    onClick={() => handleChartClick("month", pt.label)}
                                    onMouseMove={(e) => handleChartMouseMove(e, `Month: ${pt.label}`, pt.data)}
                                    onMouseLeave={handleChartMouseLeave}
                                  >
                                    <circle
                                      cx={pt.x}
                                      cy={pt.y}
                                      r={isFiltered ? "7" : "5"}
                                      fill={isFiltered ? "#ea580c" : "#06b6d4"}
                                      style={{transition:"r 0.2s, fill 0.2s, filter 0.2s"}}
                                      onMouseEnter={e => { e.currentTarget.style.filter = "brightness(1.2) drop-shadow(0 0 4px #06b6d4)"; }}
                                      onMouseLeave={e => { e.currentTarget.style.filter = ""; handleChartMouseLeave(); }}
                                    />
                                    <text
                                      x={pt.x}
                                      y={pt.y - 10}
                                      textAnchor="middle"
                                      fill="var(--text-secondary)"
                                      fontSize="10"
                                      fontWeight="700"
                                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      {pt.count}
                                    </text>
                                    <text
                                      x={pt.x}
                                      y="168"
                                      textAnchor="middle"
                                      fill={isFiltered ? "#f97316" : "var(--text-muted)"}
                                      fontSize="10"
                                      fontWeight="700"
                                      className="uppercase"
                                    >
                                      {pt.label.slice(5)}
                                    </text>
                                  </g>
                                );
                              })}
                            </>
                          );
                        })()}
                      </svg>
                    )}
                  </div>
                </div>
 
                {/* 5. Top Locations: Vertical Bar Chart */}
                <div
                  className="dashboard-card enterprise-card chart-card rounded-2xl p-6 lg:col-span-2 flex flex-col gap-5 relative cursor-pointer transition-all duration-200"
                  onClick={(e) => {
                    if (e.target.closest("button") || e.target.closest("a") || e.target.closest("g") || e.target.closest(".chart-legend")) return;
                    handleExpandChart("location");
                  }}
                >
                  <div className="flex justify-between items-center w-full">
                    <h3 className="section-heading font-extrabold uppercase tracking-wide" style={{color:"var(--text-primary)"}}>
                      Top Complaint Locations
                    </h3>
                    <button
                      onClick={() => handleExpandChart("location")}
                      className="btn-enterprise btn-enterprise-secondary text-sm font-bold uppercase cursor-pointer"
                    >
                      Expand
                    </button>
                  </div>
                  
                  <div className="w-full flex-1 flex items-end justify-center" style={{minHeight:"280px",maxHeight:"360px"}}>
                    {analytics?.location_distribution?.length === 0 ? (
                      <div className="w-full h-full flex items-center justify-center text-slate-500 font-bold text-xs uppercase">
                        No locations registered
                      </div>
                    ) : (
                      <svg viewBox="0 0 800 210" className="w-full h-full" style={{overflow:"visible"}}>
                        <line x1="40" y1="20" x2="780" y2="20" stroke="var(--border)" strokeWidth="1" strokeDasharray="3" />
                        <line x1="40" y1="85" x2="780" y2="85" stroke="var(--border)" strokeWidth="1" strokeDasharray="3" />
                        <line x1="40" y1="150" x2="780" y2="150" stroke="var(--border)" strokeWidth="1" strokeDasharray="3" />
                        <line x1="40" y1="150" x2="780" y2="150" stroke="#64748b" strokeWidth="2" />

                        {(() => {
                          const topLocs = analytics.location_distribution.slice(0, 10);
                          const maxCount = Math.max(...topLocs.map(item => item.count), 1);
                          const barWidth = Math.min(50, 680 / topLocs.length);
                          const gap = (740 - (barWidth * topLocs.length)) / (topLocs.length + 1);

                          return topLocs.map((item, index) => {
                            const barHeight = (item.count / maxCount) * 120;
                            const x = 40 + gap + index * (barWidth + gap);
                            const y = 150 - barHeight;
                            const isFiltered = chartFilterLocation === item.location;
                            const labelX = x + barWidth / 2;
                            const shortLabel = item.location.length > 12 ? item.location.slice(0, 11) + "…" : item.location;

                            return (
                              <g
                                key={item.location}
                                className="group cursor-pointer"
                                onClick={() => handleChartClick("location", item.location)}
                                onMouseMove={(e) => handleChartMouseMove(e, `Location: ${item.location}`, item)}
                                onMouseLeave={handleChartMouseLeave}
                              >
                                <title>{item.location}</title>
                                <rect
                                  x={x}
                                  y={y}
                                  width={barWidth}
                                  height={Math.max(barHeight, 2)}
                                  rx="3"
                                  fill={isFiltered ? "#ea580c" : "#10b981"}
                                  style={{transition:"fill 0.2s, filter 0.2s"}}
                                  onMouseEnter={e => { e.currentTarget.style.filter = "brightness(1.15)"; }}
                                  onMouseLeave={e => { e.currentTarget.style.filter = ""; handleChartMouseLeave(); }}
                                />
                                <text
                                  x={x + barWidth / 2}
                                  y={y - 5}
                                  textAnchor="middle"
                                  fill="var(--text-secondary)"
                                  fontSize="11"
                                  fontWeight="700"
                                >
                                  {item.count}
                                </text>
                                <text
                                  x={labelX}
                                  y="170"
                                  textAnchor="end"
                                  fill={isFiltered ? "#f97316" : "var(--text-muted)"}
                                  fontSize="10"
                                  fontWeight="700"
                                  transform={`rotate(-38, ${labelX}, 170)`}
                                >
                                  {shortLabel}
                                </text>
                              </g>
                            );
                          });
                        })()}
                      </svg>
                    )}
                  </div>
                </div>

                {/* Intelligent Tooltip overlay element */}
                {hoveredData && (
                  <div
                    className="bg-slate-900/95 border-2 border-slate-750 text-slate-100 p-3.5 text-xs font-semibold shadow-2xl pointer-events-none leading-relaxed min-w-[200px] border-l-4 border-l-amber-500 rounded-sm"
                    style={getTooltipStyle()}
                  >
                    <div className="font-black border-b border-slate-800 pb-1 mb-2 uppercase text-[9px] tracking-wider text-amber-400">
                      {hoveredData.title}
                    </div>
                    <div className="flex flex-col gap-1 text-[10px]">
                      <div className="flex justify-between gap-4 border-b border-slate-800/60 pb-0.5 text-white font-black">
                        <span>Count:</span> <span>{hoveredData.total}</span>
                      </div>
                      <div className="flex justify-between gap-4 border-b border-slate-800/60 pb-0.5 text-white font-black">
                        <span>Percentage:</span> <span>{hoveredData.percentage}%</span>
                      </div>
                      {hoveredData.category && (
                        <div className="flex justify-between gap-4 border-b border-slate-800/60 pb-0.5 text-slate-300">
                          <span>Item:</span> <span className="text-white font-semibold">{hoveredData.category}</span>
                        </div>
                      )}
                      
                      <div className="mt-1.5 pt-1.5 border-t border-slate-800/80 flex flex-col gap-1">
                        <span className="text-[8px] text-slate-500 font-extrabold uppercase tracking-wide">Breakdowns:</span>
                        <div className="flex flex-col gap-1 pl-1 text-[11px]">
                          <div className="flex justify-between text-orange-500 font-bold">
                            <span>Pending:</span> <span>{hoveredData.counts.Pending}</span>
                          </div>
                          <div className="flex justify-between text-amber-500 font-bold">
                            <span>In Progress:</span> <span>{hoveredData.counts["In Progress"]}</span>
                          </div>
                          <div className="flex justify-between text-green-500 font-bold">
                            <span>Completed:</span> <span>{hoveredData.counts.Completed}</span>
                          </div>
                          <div className="flex justify-between text-blue-500 font-bold">
                            <span>Resolved:</span> <span>{hoveredData.counts.Resolved}</span>
                          </div>
                          <div className="flex justify-between text-red-500 font-bold">
                            <span>Rejected:</span> <span>{hoveredData.counts.Rejected}</span>
                          </div>
                        </div>
                      </div>

                      {hoveredData.activeFilters && hoveredData.activeFilters.length > 0 && (
                        <div className="mt-2 pt-1.5 border-t border-slate-800">
                          <span className="text-[8px] text-slate-550 font-black uppercase block mb-1">Active Filters:</span>
                          <div className="flex flex-wrap gap-1">
                            {hoveredData.activeFilters.map((f, idx) => (
                              <span key={idx} className="px-1.5 py-0.5 bg-slate-800 text-slate-300 text-[8px] font-bold uppercase rounded-sm max-w-[120px] truncate">{f}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

              </div>
            )}

          </div>
        )}

        {/* TAB 2: COMPLAINTS REGISTER / TABLE */}
        {activeTab === "complaints" && (
          <div className="flex flex-col gap-6 w-full desktop-shell flex-1">
            
            {/* Filter controls card */}
            <div className="flex flex-col gap-6 filter-panel filter-panel-enterprise enterprise-card">
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🔍</span>
                  <h3 className="section-heading font-extrabold uppercase tracking-wide">
                    Filter Database Records
                  </h3>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleExcelExport}
                    disabled={complaintsData.count === 0}
                    className={`px-6 py-3 text-base font-bold uppercase btn-enterprise ${
                      complaintsData.count === 0
                        ? "btn-enterprise-disabled"
                        : "btn-enterprise-success cursor-pointer"
                    }`}
                  >
                    📥 Export Filtered to Excel (.xlsx)
                  </button>

                  <button
                    onClick={handleClearFilters}
                    className="btn-enterprise btn-enterprise-secondary cursor-pointer"
                  >
                    Clear All Filters
                  </button>
                </div>
              </div>

              {/* Active Multi-Dimensional Chart Filters Indicators */}
              {(chartFilterStatus || chartFilterCategory || chartFilterProject || chartFilterLocation || chartFilterMonth) && (
                <div className="bg-slate-950 border border-slate-800 p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-500 font-black uppercase text-[10px]">Active Chart Filters:</span>
                    <div className="flex flex-wrap gap-2">
                      {chartFilterStatus && (
                        <span className="bg-slate-900 text-slate-200 border border-slate-800 px-2 py-0.5 rounded-sm flex items-center gap-1.5 font-bold filter-badge">
                          Status: {chartFilterStatus}
                          <button onClick={() => setChartFilterStatus("")} className="text-rose-500 hover:text-rose-400 font-bold ml-1 font-mono">✕</button>
                        </span>
                      )}
                      {chartFilterCategory && (
                        <span className="bg-slate-900 text-slate-200 border border-slate-800 px-2 py-0.5 rounded-sm flex items-center gap-1.5 font-bold filter-badge">
                          Category: {chartFilterCategory}
                          <button onClick={() => setChartFilterCategory("")} className="text-rose-500 hover:text-rose-400 font-bold ml-1 font-mono">✕</button>
                        </span>
                      )}
                      {chartFilterProject && (
                        <span className="bg-slate-900 text-slate-200 border border-slate-800 px-2 py-0.5 rounded-sm flex items-center gap-1.5 font-bold filter-badge">
                          Project: {chartFilterProject}
                          <button onClick={() => setChartFilterProject("")} className="text-rose-500 hover:text-rose-400 font-bold ml-1 font-mono">✕</button>
                        </span>
                      )}
                      {chartFilterLocation && (
                        <span className="bg-slate-900 text-slate-200 border border-slate-800 px-2 py-0.5 rounded-sm flex items-center gap-1.5 font-bold filter-badge">
                          Location: {chartFilterLocation}
                          <button onClick={() => setChartFilterLocation("")} className="text-rose-500 hover:text-rose-400 font-bold ml-1 font-mono">✕</button>
                        </span>
                      )}
                      {chartFilterMonth && (
                        <span className="bg-slate-900 text-slate-200 border border-slate-800 px-2 py-0.5 rounded-sm flex items-center gap-1.5 font-bold filter-badge">
                          Month: {chartFilterMonth}
                          <button onClick={() => setChartFilterMonth("")} className="text-rose-500 hover:text-rose-400 font-bold ml-1 font-mono">✕</button>
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={handleClearChartFilters}
                    className="text-[10px] bg-amber-500 text-slate-950 px-2 py-1 font-black uppercase active:translate-x-0.5 active:translate-y-0.5"
                  >
                    Clear Chart Filters
                  </button>
                </div>
              )}

              {/* Advanced Query Selection Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                
                {/* Search Text */}
                <div className="flex flex-col gap-1.5">
                  <label className="filter-label">
                    Search Keyword
                  </label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Search Code, Project, Camp..."
                    className="ds-input w-full"
                  />
                </div>

                {/* Project Filter */}
                <div className="flex flex-col gap-1.5">
                  <label className="filter-label">
                    Project
                  </label>
                  <select
                    value={filterProject}
                    onChange={(e) => {
                      setFilterProject(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="ds-select w-full"
                  >
                    <option value="">-- All Projects --</option>
                    {projectsList.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Location Filter */}
                <div className="flex flex-col gap-1.5">
                  <label className="filter-label">
                    Camp / Location
                  </label>
                  <select
                    value={filterLocation}
                    onChange={(e) => {
                      setFilterLocation(e.target.value);
                      setCurrentPage(1);
                    }}
                    disabled={!filterProject}
                    className={`ds-select w-full${!filterProject ? " opacity-60 cursor-not-allowed" : ""}`}
                  >
                    <option value="">
                      {!filterProject ? "-- Select Project First --" : "-- All Locations --"}
                    </option>
                    {locationsList.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Category Filter */}
                <div className="flex flex-col gap-1.5">
                  <label className="filter-label">
                    Issue Category
                  </label>
                  <select
                    value={filterCategory}
                    onChange={(e) => {
                      setFilterCategory(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="ds-select w-full"
                  >
                    <option value="">-- All Categories --</option>
                    <option value="water">Water</option>
                    <option value="electricity">Electricity</option>
                    <option value="toilet">Toilet</option>
                    <option value="room">Room / Accommodation</option>
                    <option value="safety">Safety</option>
                    <option value="health">Health</option>
                    <option value="food">Food</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* Status Filter */}
                <div className="flex flex-col gap-1.5">
                  <label className="filter-label">
                    Status
                  </label>
                  <select
                    value={filterStatus}
                    onChange={(e) => {
                      setFilterStatus(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="ds-select w-full"
                  >
                    <option value="">-- All Statuses --</option>
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>

                {/* Business Unit Filter */}
                <div className="flex flex-col gap-1.5">
                  <label className="filter-label text-base font-extrabold uppercase text-slate-400 tracking-wider">
                    Business Unit
                  </label>
                  <select
                    value={filterBusinessUnit}
                    onChange={(e) => {
                      setFilterBusinessUnit(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="ds-select w-full"
                  >
                    <option value="">-- All Business Units --</option>
                    {[...new Set(projectsList.map((p) => p.business_unit).filter(Boolean))].sort().map((bu) => (
                      <option key={bu} value={bu}>{bu}</option>
                    ))}
                  </select>
                </div>

                {/* Language Filter */}
                <div className="flex flex-col gap-1.5">
                  <label className="filter-label">
                    Language
                  </label>
                  <select
                    value={filterLanguage}
                    onChange={(e) => {
                      setFilterLanguage(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="ds-select w-full"
                  >
                    <option value="">-- All Languages --</option>
                    <option value="en">English</option>
                    <option value="hi">Hindi</option>
                    <option value="ta">Tamil</option>
                    <option value="te">Telugu</option>
                    <option value="mr">Marathi</option>
                    <option value="or">Odia</option>
                    <option value="bn">Bengali</option>
                    <option value="pa">Punjabi</option>
                    <option value="gu">Gujarati</option>
                    <option value="as">Assamese</option>
                    <option value="kn">Kannada</option>
                    <option value="ml">Malayalam</option>
                  </select>
                </div>

                {/* Has Audio Filter */}
                <div className="flex flex-col gap-1.5">
                  <label className="filter-label">
                    Has Audio
                  </label>
                  <select
                    value={filterHasAudio}
                    onChange={(e) => {
                      setFilterHasAudio(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="ds-select w-full"
                  >
                    <option value="">-- All --</option>
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </div>

                {/* Submission Type Filter */}
                <div className="flex flex-col gap-1.5">
                  <label className="filter-label">
                    Submission Type
                  </label>
                  <select
                    value={filterSubmissionType}
                    onChange={(e) => {
                      setFilterSubmissionType(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="ds-select w-full"
                  >
                    <option value="">-- All Types --</option>
                    <option value="TEXT">Text Only</option>
                    <option value="VOICE">Voice Only</option>
                    <option value="TEXT_AND_VOICE">Text and Voice</option>
                  </select>
                </div>

                {/* Speech Status Filter */}
                <div className="flex flex-col gap-1.5">
                  <label className="filter-label">
                    Speech Status
                  </label>
                  <select
                    value={filterSpeechStatus}
                    onChange={(e) => {
                      setFilterSpeechStatus(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="ds-select w-full"
                  >
                    <option value="">-- All Statuses --</option>
                    <option value="PENDING">Pending</option>
                    <option value="PROCESSING">Processing</option>
                    <option value="RETRYING">Retrying</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="FAILED">Failed</option>
                  </select>
                </div>

                {/* Start Date */}
                <div className="flex flex-col gap-1.5">
                  <label className="filter-label">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={filterStartDate}
                    onChange={(e) => {
                      setFilterStartDate(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="ds-input w-full"
                  />
                </div>

                {/* End Date */}
                <div className="flex flex-col gap-1.5">
                  <label className="filter-label">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={filterEndDate}
                    onChange={(e) => {
                      setFilterEndDate(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="ds-input w-full"
                  />
                </div>

              </div>

            </div>

            {/* Table layout container */}
            <div className="relative flex flex-col flex-1 min-h-[400px] complaints-table-panel enterprise-card overflow-hidden">
              
              {loadingComplaints && complaintsData.results.length === 0 ? (
                <TableSkeleton />
              ) : errorComplaints ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-rose-400 min-h-[300px]">
                  <span className="font-bold mb-3">Failed to load complaints.</span>
                  <button
                    onClick={fetchComplaints}
                    className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-slate-950 font-black text-xs uppercase border border-slate-950"
                  >
                    Retry Loading List
                  </button>
                </div>
              ) : (
                <>
                  {loadingComplaints && (
                    <div className="absolute inset-0 bg-slate-950/70 z-20 flex items-center justify-center text-slate-300 font-bold uppercase tracking-wider select-none">
                      <div className="flex flex-col items-center gap-2 animate-pulse">
                        <span className="animate-spin text-2xl">⏳</span>
                        <span>Loading Complaints...</span>
                      </div>
                    </div>
                  )}
                  <div className="overflow-x-auto complaint-table-scroll">
                    <table className="w-full text-left border-collapse dashboard-table">
                      
                      <thead>
                        <tr className="bg-slate-950 text-slate-300 border-b-2 border-slate-800 select-none">
                          <th className="px-5 py-4 font-black uppercase tracking-wider">Reference Code</th>
                          <th
                            onClick={() => handleSortClick("project__name")}
                            className="px-5 py-4 font-extrabold uppercase tracking-wider cursor-pointer hover:bg-slate-900 group min-w-[180px]"
                          >
                            Project {sortingState.includes("project__name") ? (sortingState.startsWith("-") ? "▼" : "▲") : "↕"}
                          </th>
                          <th className="px-5 py-4 font-extrabold uppercase tracking-wider min-w-[160px]">Business Unit</th>
                          <th className="px-5 py-4 font-extrabold uppercase tracking-wider min-w-[160px]">Location</th>
                          <th
                            onClick={() => handleSortClick("category")}
                            className="px-5 py-4 font-black uppercase tracking-wider cursor-pointer hover:bg-slate-900"
                          >
                            Category {sortingState.includes("category") ? (sortingState.startsWith("-") ? "▼" : "▲") : "↕"}
                          </th>
                          <th className="px-5 py-4 font-black uppercase tracking-wider">Lang</th>
                          <th
                            onClick={() => handleSortClick("created_at")}
                            className="px-5 py-4 font-black uppercase tracking-wider cursor-pointer hover:bg-slate-900"
                          >
                            Created Date {sortingState.includes("created_at") ? (sortingState.startsWith("-") ? "▼" : "▲") : "↕"}
                          </th>
                          <th
                            onClick={() => handleSortClick("status")}
                            className="px-5 py-4 font-black uppercase tracking-wider cursor-pointer hover:bg-slate-900"
                          >
                            Status {sortingState.includes("status") ? (sortingState.startsWith("-") ? "▼" : "▲") : "↕"}
                          </th>
                          <th className="px-5 py-4 font-black uppercase tracking-wider text-center">Media</th>
                          <th className="px-5 py-4 font-extrabold uppercase tracking-wider text-right min-w-[160px]">Actions</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-800">
                        {complaintsData.results.length === 0 ? (
                          <tr>
                            <td colSpan="10" className="px-5 py-8 text-center text-slate-500 font-bold uppercase">
                              No complaints found.
                            </td>
                          </tr>
                        ) : (
                          complaintsData.results.map((complaint) => (
                            <tr
                              key={complaint.id}
                              className="hover:bg-slate-850/50 transition-colors"
                            >
                              <td className="px-5 py-4 font-bold text-white font-mono">{complaint.reference_number}</td>
                              <td className="px-5 py-4 font-semibold min-w-[180px]">{complaint.project_name}</td>
                              <td className="px-5 py-4 font-semibold text-slate-300 min-w-[160px]">{complaint.business_unit || "—"}</td>
                              <td className="px-5 py-4 font-semibold min-w-[160px]">{complaint.location_name}</td>
                              <td className="px-5 py-4 font-bold uppercase text-amber-500">{complaint.category}</td>
                              <td className="px-5 py-4 font-bold text-slate-400 uppercase font-mono">{complaint.language}</td>
                              <td className="px-5 py-4 font-semibold text-slate-300">
                                {new Date(complaint.created_at).toLocaleDateString()}
                              </td>
                              <td className="px-5 py-4">
                                <span className={`ds-badge font-black uppercase ${getBadgeStyle(complaint.status)}`}>
                                  {complaint.status}
                                </span>
                              </td>
                              
                              <td className="px-5 py-4">
                                <div className="flex items-center justify-center gap-3">
                                  {complaint.photo_url ? (
                                    <div className="w-8 h-8 border border-slate-700 bg-black overflow-hidden flex items-center justify-center relative group">
                                      <img
                                        src={complaint.photo_url}
                                        alt="evidence"
                                        className="object-cover w-full h-full cursor-zoom-in"
                                        onClick={() => {
                                          setLightboxUrl(complaint.photo_url);
                                          setZoomScale(1);
                                        }}
                                        onError={(e) => {
                                          e.target.style.display = "none";
                                          e.target.parentElement.innerHTML = "<span title='Image unavailable' style='color:#475569;font-size:9px;font-weight:700;'>N/A</span>";
                                        }}
                                      />
                                    </div>
                                  ) : (
                                    <span className="text-slate-600 font-bold">-</span>
                                  )}

                                  {complaint.audio_url ? (
                                    <div className="flex items-center gap-1.5">
                                      <button
                                        onClick={() => {
                                          try {
                                            const aud = new Audio(complaint.audio_url);
                                            aud.onerror = null; // silent fail in table
                                            aud.play().catch(() => {});
                                          } catch (e) {}
                                        }}
                                        className="w-7 h-7 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-sm flex items-center justify-center text-xs cursor-pointer active:scale-95 flex-shrink-0"
                                        title="Play audio clip"
                                      >
                                        🔊
                                      </button>
                                      {(() => {
                                        let badgeColor = "bg-slate-800 text-slate-400 border border-slate-700";
                                        let label = "PENDING";
                                        if (complaint.transcription_status === "PROCESSING") {
                                          badgeColor = "bg-blue-600/20 text-blue-400 border border-blue-500/30";
                                          label = "PROCESSING";
                                        } else if (complaint.transcription_status === "RETRYING") {
                                          badgeColor = "bg-amber-600/20 text-amber-400 border border-amber-500/30 animate-pulse";
                                          label = "RETRYING";
                                        } else if (complaint.transcription_status === "COMPLETED") {
                                          badgeColor = "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30";
                                          label = "STT DONE";
                                        } else if (complaint.transcription_status === "FAILED") {
                                          badgeColor = "bg-rose-600/20 text-rose-400 border border-rose-500/30";
                                          label = "STT FAIL";
                                        }
                                        return (
                                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-tight ${badgeColor}`}>
                                            {label}
                                          </span>
                                        );
                                      })()}
                                    </div>
                                  ) : (
                                    <span className="text-slate-600 font-bold">-</span>
                                  )}
                                </div>
                              </td>

                              <td className="px-5 py-4 text-right min-w-[140px]">
                                <button
                                  onClick={() => setSelectedComplaint(complaint)}
                                  className="btn-enterprise btn-enterprise-primary px-5 py-2.5 min-w-[140px] cursor-pointer text-sm"
                                >
                                  View / Update
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>

                    </table>
                  </div>

                  {/* Pagination footer */}
                  {complaintsData.count > 25 && (
                    <div className="mt-auto border-t border-slate-800 p-5 bg-slate-950 flex items-center justify-between select-none flex-wrap gap-3">
                      <span className="text-sm text-slate-400 font-semibold">
                        Page <span className="font-black text-white">{currentPage}</span> of{" "}
                        <span className="font-black text-white">
                          {Math.ceil(complaintsData.count / 25)}
                        </span>{" "}
                        <span className="text-slate-500">({complaintsData.count.toLocaleString()} total records)</span>
                      </span>

                      <div className="flex items-center gap-3 pagination-controls">
                        <button
                          disabled={currentPage === 1}
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          className={`pagination-btn px-5 py-3 text-base font-bold uppercase border-2 rounded-lg transition-all ${
                            currentPage === 1
                              ? "bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed"
                              : "bg-slate-800 hover:bg-slate-700 border-slate-700 text-white cursor-pointer"
                          }`}
                        >
                          ◀ Prev
                        </button>

                        {(() => {
                          const totalPages = Math.ceil(complaintsData.count / 25);
                          const pageNumbers = [];
                          const start = Math.max(1, currentPage - 3);
                          const end = Math.min(totalPages, currentPage + 3);
                          for (let i = start; i <= end; i++) {
                            pageNumbers.push(i);
                          }
                          return pageNumbers.map((num) => (
                            <button
                              key={num}
                              onClick={() => setCurrentPage(num)}
                              className={`pagination-btn w-12 h-12 text-base font-bold border-2 rounded-lg transition-all ${
                                currentPage === num
                                  ? "bg-blue-600 text-white border-blue-500"
                                  : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700 cursor-pointer"
                              }`}
                            >
                              {num}
                            </button>
                          ));
                        })()}

                        <button
                          disabled={currentPage * 25 >= complaintsData.count}
                          onClick={() => setCurrentPage((p) => p + 1)}
                          className={`pagination-btn px-5 py-3 text-base font-bold uppercase border-2 rounded-lg transition-all ${
                            currentPage * 25 >= complaintsData.count
                              ? "bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed"
                              : "bg-slate-800 hover:bg-slate-700 border-slate-700 text-white cursor-pointer"
                          }`}
                        >
                          Next ▶
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

            </div>

          </div>
        )}

        {/* TAB: MASTER DATA */}
        {activeTab === "master-data" && (
          <div className="flex flex-col gap-6 w-full desktop-shell">

            {/* Sub-tab selector */}
            <div className="enterprise-card p-1 flex gap-1 rounded-2xl">
              {["projects","locations","categories","languages"].map(tab => (
                <button
                  key={tab}
                  onClick={() => setMasterDataTab(tab)}
                  className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold uppercase tracking-wide transition-all cursor-pointer ${
                    masterDataTab === tab
                      ? "btn-enterprise-primary"
                      : "hover:bg-[var(--bg-hover)] text-[var(--text-muted)]"
                  }`}
                  style={masterDataTab === tab ? {background:"var(--primary)",color:"#fff"} : {}}
                >
                  {tab === "projects" ? "Projects & Business Units" : tab.charAt(0).toUpperCase()+tab.slice(1)}
                </button>
              ))}
            </div>

            {loadingMasterData ? (
              <div className="enterprise-card p-16 flex items-center justify-center">
                <span className="text-[var(--text-muted)] font-bold uppercase tracking-widest animate-pulse">Loading master data...</span>
              </div>
            ) : (
              <>
                {/* PROJECTS */}
                {masterDataTab === "projects" && (
                  <div className="enterprise-card flex flex-col gap-0 overflow-hidden">
                    <div className="flex items-center justify-between p-6 border-b border-[var(--border)]">
                      <div>
                        <h3 className="section-heading font-extrabold uppercase" style={{color:"var(--text-primary)"}}>Projects & Business Units</h3>
                        <p className="text-sm mt-1" style={{color:"var(--text-muted)"}}>{masterProjects.length} projects registered</p>
                      </div>
                      <button
                        onClick={() => { setMasterEditItem({type:"projects",isNew:true}); setMasterForm({name:"",business_unit:"",is_active:true}); }}
                        className="btn-enterprise btn-enterprise-primary cursor-pointer"
                      >
                        + Add Project
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse dashboard-table">
                        <thead>
                          <tr style={{background:"var(--bg-secondary)",borderBottom:"2px solid var(--border)"}}>
                            <th className="px-5 py-4 font-bold uppercase text-sm" style={{color:"var(--text-secondary)"}}>Project Name</th>
                            <th className="px-5 py-4 font-bold uppercase text-sm" style={{color:"var(--text-secondary)"}}>Business Unit</th>
                            <th className="px-5 py-4 font-bold uppercase text-sm text-center" style={{color:"var(--text-secondary)"}}>Status</th>
                            <th className="px-5 py-4 font-bold uppercase text-sm text-right" style={{color:"var(--text-secondary)"}}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {masterProjects.length === 0 ? (
                            <tr><td colSpan="4" className="px-5 py-10 text-center font-bold uppercase" style={{color:"var(--text-muted)"}}>No projects found</td></tr>
                          ) : masterProjects.map(p => (
                            <tr key={p.id} className="border-b hover:bg-[var(--bg-hover)] transition-colors" style={{borderColor:"var(--border)"}}>
                              <td className="px-5 py-4 font-semibold" style={{color:"var(--text-primary)"}}>{p.name}</td>
                              <td className="px-5 py-4">
                                <span className="ds-badge ds-badge-info">{p.business_unit || "—"}</span>
                              </td>
                              <td className="px-5 py-4 text-center">
                                <span className={`ds-badge ${p.is_active ? "ds-badge-completed" : "ds-badge-rejected"}`}>{p.is_active ? "Active" : "Inactive"}</span>
                              </td>
                              <td className="px-5 py-4 text-right">
                                <button
                                  onClick={() => { setMasterEditItem({type:"projects",id:p.id}); setMasterForm({name:p.name,business_unit:p.business_unit||"",is_active:p.is_active}); }}
                                  className="btn-enterprise btn-enterprise-secondary text-xs cursor-pointer mr-2"
                                >Edit</button>
                                <button
                                  onClick={() => deleteMasterItem("projects", p.id)}
                                  className="btn-enterprise btn-enterprise-secondary text-xs cursor-pointer" style={{color:"var(--danger)"}}
                                >Delete</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Inline edit/create form */}
                    {masterEditItem?.type === "projects" && (
                      <div className="p-6 border-t flex flex-col gap-4" style={{borderColor:"var(--border)",background:"var(--bg-secondary)"}}>
                        <h4 className="font-extrabold uppercase text-sm" style={{color:"var(--text-primary)"}}>
                          {masterEditItem.isNew ? "Add New Project" : "Edit Project"}
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold uppercase" style={{color:"var(--text-secondary)"}}>Project Name *</label>
                            <input type="text" value={masterForm.name||""} onChange={e=>setMasterForm(f=>({...f,name:e.target.value}))}
                              className="ds-input" placeholder="e.g. KUDANKULAM PROJECT HTS" />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold uppercase" style={{color:"var(--text-secondary)"}}>Business Unit *</label>
                            <input type="text" value={masterForm.business_unit||""} onChange={e=>setMasterForm(f=>({...f,business_unit:e.target.value}))}
                              className="ds-input" placeholder="e.g. NUCLEAR & DEFENSE" list="bu-suggestions" />
                            <datalist id="bu-suggestions">
                              {[...new Set(masterProjects.map(p=>p.business_unit).filter(Boolean))].sort().map(bu=>(
                                <option key={bu} value={bu}/>
                              ))}
                            </datalist>
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold uppercase" style={{color:"var(--text-secondary)"}}>Active</label>
                            <select value={masterForm.is_active?"true":"false"} onChange={e=>setMasterForm(f=>({...f,is_active:e.target.value==="true"}))}
                              className="ds-select">
                              <option value="true">Active</option>
                              <option value="false">Inactive</option>
                            </select>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <button onClick={()=>saveMasterItem("projects",masterForm,masterEditItem.isNew?null:masterEditItem.id)} className="btn-enterprise btn-enterprise-primary cursor-pointer">Save</button>
                          <button onClick={()=>{setMasterEditItem(null);setMasterForm({});}} className="btn-enterprise btn-enterprise-secondary cursor-pointer">Cancel</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* LOCATIONS */}
                {masterDataTab === "locations" && (
                  <div className="enterprise-card flex flex-col gap-0 overflow-hidden">
                    <div className="flex items-center justify-between p-6 border-b" style={{borderColor:"var(--border)"}}>
                      <div>
                        <h3 className="section-heading font-extrabold uppercase" style={{color:"var(--text-primary)"}}>Locations</h3>
                        <p className="text-sm mt-1" style={{color:"var(--text-muted)"}}>{masterLocations.length} locations registered</p>
                      </div>
                      <button
                        onClick={() => { setMasterEditItem({type:"locations",isNew:true}); setMasterForm({name:"",project:"",is_active:true}); }}
                        className="btn-enterprise btn-enterprise-primary cursor-pointer"
                      >
                        + Add Location
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse dashboard-table">
                        <thead>
                          <tr style={{background:"var(--bg-secondary)",borderBottom:"2px solid var(--border)"}}>
                            <th className="px-5 py-4 font-bold uppercase text-sm" style={{color:"var(--text-secondary)"}}>Location Name</th>
                            <th className="px-5 py-4 font-bold uppercase text-sm" style={{color:"var(--text-secondary)"}}>Project</th>
                            <th className="px-5 py-4 font-bold uppercase text-sm text-center" style={{color:"var(--text-secondary)"}}>Status</th>
                            <th className="px-5 py-4 font-bold uppercase text-sm text-right" style={{color:"var(--text-secondary)"}}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {masterLocations.length === 0 ? (
                            <tr><td colSpan="4" className="px-5 py-10 text-center font-bold uppercase" style={{color:"var(--text-muted)"}}>No locations found</td></tr>
                          ) : masterLocations.map(l => (
                            <tr key={l.id} className="border-b hover:bg-[var(--bg-hover)] transition-colors" style={{borderColor:"var(--border)"}}>
                              <td className="px-5 py-4 font-semibold" style={{color:"var(--text-primary)"}}>{l.name}</td>
                              <td className="px-5 py-4 text-sm" style={{color:"var(--text-secondary)"}}>{masterProjects.find(p=>p.id===l.project)?.name || l.project}</td>
                              <td className="px-5 py-4 text-center">
                                <span className={`ds-badge ${l.is_active ? "ds-badge-completed" : "ds-badge-rejected"}`}>{l.is_active ? "Active" : "Inactive"}</span>
                              </td>
                              <td className="px-5 py-4 text-right">
                                <button onClick={()=>{ setMasterEditItem({type:"locations",id:l.id}); setMasterForm({name:l.name,project:l.project,is_active:l.is_active}); }}
                                  className="btn-enterprise btn-enterprise-secondary text-xs cursor-pointer mr-2">Edit</button>
                                <button onClick={()=>deleteMasterItem("locations",l.id)}
                                  className="btn-enterprise btn-enterprise-secondary text-xs cursor-pointer" style={{color:"var(--danger)"}}>Delete</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {masterEditItem?.type === "locations" && (
                      <div className="p-6 border-t flex flex-col gap-4" style={{borderColor:"var(--border)",background:"var(--bg-secondary)"}}>
                        <h4 className="font-extrabold uppercase text-sm" style={{color:"var(--text-primary)"}}>{masterEditItem.isNew ? "Add Location" : "Edit Location"}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold uppercase" style={{color:"var(--text-secondary)"}}>Location Name *</label>
                            <input type="text" value={masterForm.name||""} onChange={e=>setMasterForm(f=>({...f,name:e.target.value}))} className="ds-input" placeholder="e.g. Block A" />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold uppercase" style={{color:"var(--text-secondary)"}}>Project *</label>
                            <select value={masterForm.project||""} onChange={e=>setMasterForm(f=>({...f,project:e.target.value}))} className="ds-select">
                              <option value="">-- Select Project --</option>
                              {masterProjects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold uppercase" style={{color:"var(--text-secondary)"}}>Active</label>
                            <select value={masterForm.is_active?"true":"false"} onChange={e=>setMasterForm(f=>({...f,is_active:e.target.value==="true"}))} className="ds-select">
                              <option value="true">Active</option>
                              <option value="false">Inactive</option>
                            </select>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <button onClick={()=>saveMasterItem("locations",masterForm,masterEditItem.isNew?null:masterEditItem.id)} className="btn-enterprise btn-enterprise-primary cursor-pointer">Save</button>
                          <button onClick={()=>{setMasterEditItem(null);setMasterForm({});}} className="btn-enterprise btn-enterprise-secondary cursor-pointer">Cancel</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* CATEGORIES */}
                {masterDataTab === "categories" && (
                  <div className="enterprise-card flex flex-col gap-0 overflow-hidden">
                    <div className="flex items-center justify-between p-6 border-b" style={{borderColor:"var(--border)"}}>
                      <div>
                        <h3 className="section-heading font-extrabold uppercase" style={{color:"var(--text-primary)"}}>Issue Categories</h3>
                        <p className="text-sm mt-1" style={{color:"var(--text-muted)"}}>{masterCategories.length} categories registered</p>
                      </div>
                      <button
                        onClick={() => { setMasterEditItem({type:"categories",isNew:true}); setMasterForm({slug:"",label:"",is_active:true,sort_order:0}); }}
                        className="btn-enterprise btn-enterprise-primary cursor-pointer"
                      >
                        + Add Category
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse dashboard-table">
                        <thead>
                          <tr style={{background:"var(--bg-secondary)",borderBottom:"2px solid var(--border)"}}>
                            <th className="px-5 py-4 font-bold uppercase text-sm" style={{color:"var(--text-secondary)"}}>Slug</th>
                            <th className="px-5 py-4 font-bold uppercase text-sm" style={{color:"var(--text-secondary)"}}>Label</th>
                            <th className="px-5 py-4 font-bold uppercase text-sm text-center" style={{color:"var(--text-secondary)"}}>Order</th>
                            <th className="px-5 py-4 font-bold uppercase text-sm text-center" style={{color:"var(--text-secondary)"}}>Status</th>
                            <th className="px-5 py-4 font-bold uppercase text-sm text-right" style={{color:"var(--text-secondary)"}}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {masterCategories.length === 0 ? (
                            <tr><td colSpan="5" className="px-5 py-10 text-center font-bold uppercase" style={{color:"var(--text-muted)"}}>No categories found</td></tr>
                          ) : masterCategories.map(c => (
                            <tr key={c.id} className="border-b hover:bg-[var(--bg-hover)] transition-colors" style={{borderColor:"var(--border)"}}>
                              <td className="px-5 py-4 font-mono font-bold text-xs" style={{color:"var(--primary)"}}>{c.slug}</td>
                              <td className="px-5 py-4 font-semibold" style={{color:"var(--text-primary)"}}>{c.label}</td>
                              <td className="px-5 py-4 text-center font-bold" style={{color:"var(--text-muted)"}}>{c.sort_order}</td>
                              <td className="px-5 py-4 text-center">
                                <span className={`ds-badge ${c.is_active ? "ds-badge-completed" : "ds-badge-rejected"}`}>{c.is_active ? "Active" : "Inactive"}</span>
                              </td>
                              <td className="px-5 py-4 text-right">
                                <button onClick={()=>{ setMasterEditItem({type:"categories",id:c.id}); setMasterForm({slug:c.slug,label:c.label,is_active:c.is_active,sort_order:c.sort_order}); }}
                                  className="btn-enterprise btn-enterprise-secondary text-xs cursor-pointer mr-2">Edit</button>
                                <button onClick={()=>deleteMasterItem("categories",c.id)}
                                  className="btn-enterprise btn-enterprise-secondary text-xs cursor-pointer" style={{color:"var(--danger)"}}>Deactivate</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {masterEditItem?.type === "categories" && (
                      <div className="p-6 border-t flex flex-col gap-4" style={{borderColor:"var(--border)",background:"var(--bg-secondary)"}}>
                        <h4 className="font-extrabold uppercase text-sm" style={{color:"var(--text-primary)"}}>{masterEditItem.isNew ? "Add Category" : "Edit Category"}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold uppercase" style={{color:"var(--text-secondary)"}}>Slug *</label>
                            <input type="text" value={masterForm.slug||""} onChange={e=>setMasterForm(f=>({...f,slug:e.target.value}))} className="ds-input font-mono" placeholder="e.g. water" />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold uppercase" style={{color:"var(--text-secondary)"}}>Label *</label>
                            <input type="text" value={masterForm.label||""} onChange={e=>setMasterForm(f=>({...f,label:e.target.value}))} className="ds-input" placeholder="e.g. Water" />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold uppercase" style={{color:"var(--text-secondary)"}}>Sort Order</label>
                            <input type="number" value={masterForm.sort_order||0} onChange={e=>setMasterForm(f=>({...f,sort_order:parseInt(e.target.value)||0}))} className="ds-input" />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold uppercase" style={{color:"var(--text-secondary)"}}>Active</label>
                            <select value={masterForm.is_active?"true":"false"} onChange={e=>setMasterForm(f=>({...f,is_active:e.target.value==="true"}))} className="ds-select">
                              <option value="true">Active</option>
                              <option value="false">Inactive</option>
                            </select>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <button onClick={()=>saveMasterItem("categories",masterForm,masterEditItem.isNew?null:masterEditItem.id)} className="btn-enterprise btn-enterprise-primary cursor-pointer">Save</button>
                          <button onClick={()=>{setMasterEditItem(null);setMasterForm({});}} className="btn-enterprise btn-enterprise-secondary cursor-pointer">Cancel</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* LANGUAGES */}
                {masterDataTab === "languages" && (
                  <div className="enterprise-card flex flex-col gap-0 overflow-hidden">
                    <div className="flex items-center justify-between p-6 border-b" style={{borderColor:"var(--border)"}}>
                      <div>
                        <h3 className="section-heading font-extrabold uppercase" style={{color:"var(--text-primary)"}}>Languages</h3>
                        <p className="text-sm mt-1" style={{color:"var(--text-muted)"}}>{masterLanguages.length} languages registered</p>
                      </div>
                      <button
                        onClick={() => { setMasterEditItem({type:"languages",isNew:true}); setMasterForm({code:"",name:"",is_active:true,sort_order:0}); }}
                        className="btn-enterprise btn-enterprise-primary cursor-pointer"
                      >
                        + Add Language
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse dashboard-table">
                        <thead>
                          <tr style={{background:"var(--bg-secondary)",borderBottom:"2px solid var(--border)"}}>
                            <th className="px-5 py-4 font-bold uppercase text-sm" style={{color:"var(--text-secondary)"}}>Code</th>
                            <th className="px-5 py-4 font-bold uppercase text-sm" style={{color:"var(--text-secondary)"}}>Name</th>
                            <th className="px-5 py-4 font-bold uppercase text-sm text-center" style={{color:"var(--text-secondary)"}}>Order</th>
                            <th className="px-5 py-4 font-bold uppercase text-sm text-center" style={{color:"var(--text-secondary)"}}>Status</th>
                            <th className="px-5 py-4 font-bold uppercase text-sm text-right" style={{color:"var(--text-secondary)"}}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {masterLanguages.length === 0 ? (
                            <tr><td colSpan="5" className="px-5 py-10 text-center font-bold uppercase" style={{color:"var(--text-muted)"}}>No languages found</td></tr>
                          ) : masterLanguages.map(l => (
                            <tr key={l.id} className="border-b hover:bg-[var(--bg-hover)] transition-colors" style={{borderColor:"var(--border)"}}>
                              <td className="px-5 py-4 font-mono font-bold text-xs" style={{color:"var(--primary)"}}>{l.code}</td>
                              <td className="px-5 py-4 font-semibold" style={{color:"var(--text-primary)"}}>{l.name}</td>
                              <td className="px-5 py-4 text-center font-bold" style={{color:"var(--text-muted)"}}>{l.sort_order}</td>
                              <td className="px-5 py-4 text-center">
                                <span className={`ds-badge ${l.is_active ? "ds-badge-completed" : "ds-badge-rejected"}`}>{l.is_active ? "Active" : "Inactive"}</span>
                              </td>
                              <td className="px-5 py-4 text-right">
                                <button onClick={()=>{ setMasterEditItem({type:"languages",id:l.id}); setMasterForm({code:l.code,name:l.name,is_active:l.is_active,sort_order:l.sort_order}); }}
                                  className="btn-enterprise btn-enterprise-secondary text-xs cursor-pointer mr-2">Edit</button>
                                <button onClick={()=>deleteMasterItem("languages",l.id)}
                                  className="btn-enterprise btn-enterprise-secondary text-xs cursor-pointer" style={{color:"var(--danger)"}}>Deactivate</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {masterEditItem?.type === "languages" && (
                      <div className="p-6 border-t flex flex-col gap-4" style={{borderColor:"var(--border)",background:"var(--bg-secondary)"}}>
                        <h4 className="font-extrabold uppercase text-sm" style={{color:"var(--text-primary)"}}>{masterEditItem.isNew ? "Add Language" : "Edit Language"}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold uppercase" style={{color:"var(--text-secondary)"}}>Code *</label>
                            <input type="text" value={masterForm.code||""} onChange={e=>setMasterForm(f=>({...f,code:e.target.value}))} className="ds-input font-mono" placeholder="e.g. hi" />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold uppercase" style={{color:"var(--text-secondary)"}}>Name *</label>
                            <input type="text" value={masterForm.name||""} onChange={e=>setMasterForm(f=>({...f,name:e.target.value}))} className="ds-input" placeholder="e.g. Hindi" />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold uppercase" style={{color:"var(--text-secondary)"}}>Sort Order</label>
                            <input type="number" value={masterForm.sort_order||0} onChange={e=>setMasterForm(f=>({...f,sort_order:parseInt(e.target.value)||0}))} className="ds-input" />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold uppercase" style={{color:"var(--text-secondary)"}}>Active</label>
                            <select value={masterForm.is_active?"true":"false"} onChange={e=>setMasterForm(f=>({...f,is_active:e.target.value==="true"}))} className="ds-select">
                              <option value="true">Active</option>
                              <option value="false">Inactive</option>
                            </select>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <button onClick={()=>saveMasterItem("languages",masterForm,masterEditItem.isNew?null:masterEditItem.id)} className="btn-enterprise btn-enterprise-primary cursor-pointer">Save</button>
                          <button onClick={()=>{setMasterEditItem(null);setMasterForm({});}} className="btn-enterprise btn-enterprise-secondary cursor-pointer">Cancel</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* TAB 3: SYSTEM SETTINGS */}
        {activeTab === "settings" && (
          <div className="flex flex-col gap-6 w-full desktop-shell">
            
            {/* Super Admin-Only User Management section */}
            {isSuperuser ? (
              <div className="enterprise-card p-6 flex flex-col gap-6">
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4" style={{borderColor:"var(--border)"}}>
                  <div>
                    <h3 className="section-heading font-extrabold uppercase" style={{color:"var(--text-primary)"}}>User & Access Control</h3>
                    <p className="text-sm mt-1" style={{color:"var(--text-muted)"}}>Manage administrator accounts and permissions</p>
                  </div>

                  <button
                    onClick={() => setShowCreateUserModal(true)}
                    className="btn-enterprise btn-enterprise-primary cursor-pointer"
                  >
                    + Create Administrator
                  </button>
                </div>

                {/* Administrators list table */}
                <div className="overflow-x-auto rounded-xl border" style={{borderColor:"var(--border)"}}>
                  {loadingAdminUsers ? (
                    <div className="p-8 text-center font-bold uppercase animate-pulse" style={{color:"var(--text-muted)"}}>
                      Loading admin accounts...
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse dashboard-table user-management-table">
                      <thead>
                        <tr style={{background:"var(--bg-secondary)",borderBottom:"2px solid var(--border)"}}>
                          <th className="px-5 py-4 font-bold uppercase text-sm" style={{color:"var(--text-secondary)"}}>Username</th>
                          <th className="px-5 py-4 font-bold uppercase text-sm" style={{color:"var(--text-secondary)"}}>Email</th>
                          <th className="px-5 py-4 font-bold uppercase text-sm" style={{color:"var(--text-secondary)"}}>Role</th>
                          <th className="px-5 py-4 font-bold uppercase text-sm" style={{color:"var(--text-secondary)"}}>Created</th>
                          <th className="px-5 py-4 font-bold uppercase text-sm" style={{color:"var(--text-secondary)"}}>Last Login</th>
                          <th className="px-5 py-4 font-bold uppercase text-sm text-center" style={{color:"var(--text-secondary)"}}>Status</th>
                          <th className="px-5 py-4 font-bold uppercase text-sm text-right" style={{color:"var(--text-secondary)"}}>Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y" style={{borderColor:"var(--border)"}}>
                        {adminUsers.map((user) => {
                          const isSelf = user.username === adminUsername;
                          const isEditing = editingUserId === user.id;

                          return (
                            <tr key={user.id} className="transition-colors hover:bg-[var(--bg-hover)]">
                              <td className="px-5 py-4 font-bold font-mono" style={{color:"var(--text-primary)"}}>{user.username} {isSelf && <span className="ds-badge ds-badge-info ml-1">You</span>}</td>
                              
                              {/* Email Edit field */}
                              <td className="px-5 py-4">
                                {isEditing ? (
                                  <input type="email" value={editingEmail} onChange={(e) => setEditingEmail(e.target.value)} className="ds-input text-sm" />
                                ) : (
                                  <span style={{color:"var(--text-secondary)"}}>{user.email || "—"}</span>
                                )}
                              </td>

                              {/* Role Selector */}
                              <td className="px-5 py-4">
                                {isEditing ? (
                                  <select value={editingRole} onChange={(e) => setEditingRole(e.target.value)} className="ds-select text-sm">
                                    <option value="Admin">Admin</option>
                                    <option value="Super Admin">Super Admin</option>
                                  </select>
                                ) : (
                                  <span className={`ds-badge ${user.is_superuser ? "ds-badge-danger" : "ds-badge-info"}`}>
                                    {user.is_superuser ? "Super Admin" : "Admin"}
                                  </span>
                                )}
                              </td>

                              <td className="px-5 py-4 text-sm" style={{color:"var(--text-muted)"}}>{new Date(user.date_joined).toLocaleDateString()}</td>
                              <td className="px-5 py-4 text-sm font-mono" style={{color:"var(--text-muted)"}}>{user.last_login ? new Date(user.last_login).toLocaleString() : "Never"}</td>

                              {/* Active Toggle */}
                              <td className="px-5 py-4 text-center">
                                <button
                                  onClick={() => handleToggleUserActive(user.id, !user.is_active, user.email, user.is_superuser)}
                                  disabled={isSelf}
                                  className={`ds-badge cursor-pointer border transition-all ${isSelf ? "opacity-50 cursor-not-allowed" : ""} ${user.is_active ? "ds-badge-completed" : "ds-badge-rejected"}`}
                                  title={isSelf ? "Cannot disable own account" : "Toggle status"}
                                >
                                  {user.is_active ? "Active" : "Inactive"}
                                </button>
                              </td>

                              {/* Edit Actions */}
                              <td className="px-5 py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {isEditing ? (
                                    <>
                                      <button onClick={() => handleUpdateUserDetails(user.id, editingEmail, editingRole, user.is_active)} className="btn-enterprise btn-enterprise-success text-xs cursor-pointer">Save</button>
                                      <button onClick={() => setEditingUserId(null)} className="btn-enterprise btn-enterprise-secondary text-xs cursor-pointer">Cancel</button>
                                    </>
                                  ) : (
                                    <>
                                      <button onClick={() => { setEditingUserId(user.id); setEditingEmail(user.email || ""); setEditingRole(user.is_superuser ? "Super Admin" : "Admin"); }}
                                        className="btn-enterprise btn-enterprise-secondary text-xs cursor-pointer">Edit</button>
                                      <button onClick={() => { setResetUserId(user.id); setResetUsername(user.username); setResetNewPassword(""); setResetPasswordError(""); setShowResetPasswordModal(true); }}
                                        className="btn-enterprise btn-enterprise-secondary text-xs cursor-pointer" style={{color:"var(--warning)"}}>Reset Pass</button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Login History Session Logs */}
                <div className="flex items-center gap-2 border-b pb-3 mt-2" style={{borderColor:"var(--border)"}}>
                  <h4 className="font-extrabold uppercase text-sm" style={{color:"var(--text-primary)"}}>Login Activity Audit</h4>
                </div>

                <div className="overflow-x-auto rounded-xl border max-h-64 overflow-y-auto audit-log-scroll" style={{borderColor:"var(--border)"}}>
                  {loadingActivityLogs ? (
                    <div className="p-8 text-center font-bold uppercase animate-pulse" style={{color:"var(--text-muted)"}}>Loading activity logs...</div>
                  ) : (
                    <table className="w-full text-left border-collapse dashboard-table audit-log-table">
                      <thead>
                        <tr style={{background:"var(--bg-secondary)",borderBottom:"2px solid var(--border)"}}>
                          <th className="px-4 py-3 font-bold uppercase text-xs" style={{color:"var(--text-secondary)"}}>Operator</th>
                          <th className="px-4 py-3 font-bold uppercase text-xs" style={{color:"var(--text-secondary)"}}>IP Address</th>
                          <th className="px-4 py-3 font-bold uppercase text-xs" style={{color:"var(--text-secondary)"}}>Browser</th>
                          <th className="px-4 py-3 font-bold uppercase text-xs" style={{color:"var(--text-secondary)"}}>Device</th>
                          <th className="px-4 py-3 font-bold uppercase text-xs" style={{color:"var(--text-secondary)"}}>Login</th>
                          <th className="px-4 py-3 font-bold uppercase text-xs" style={{color:"var(--text-secondary)"}}>Logout</th>
                          <th className="px-4 py-3 font-bold uppercase text-xs text-right" style={{color:"var(--text-secondary)"}}>Duration</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activityLogs.length === 0 ? (
                          <tr><td colSpan="7" className="px-4 py-8 text-center font-bold uppercase" style={{color:"var(--text-muted)"}}>No activity logs registered.</td></tr>
                        ) : (
                          activityLogs.map((log) => (
                            <tr key={log.id} className="border-b hover:bg-[var(--bg-hover)] transition-colors" style={{borderColor:"var(--border)"}}>
                              <td className="px-4 py-3 font-bold font-mono text-sm" style={{color:"var(--text-primary)"}}>{log.username}</td>
                              <td className="px-4 py-3 font-mono text-sm" style={{color:"var(--text-secondary)"}}>{log.ip_address || "—"}</td>
                              <td className="px-4 py-3 uppercase text-xs font-mono" style={{color:"var(--info)"}}>{log.browser}</td>
                              <td className="px-4 py-3 uppercase text-xs font-mono" style={{color:"var(--secondary)"}}>{log.device_type}</td>
                              <td className="px-4 py-3 font-mono text-xs" style={{color:"var(--text-muted)"}}>{log.login_time ? new Date(log.login_time).toLocaleString() : "—"}</td>
                              <td className="px-4 py-3 font-mono text-xs" style={{color:"var(--text-muted)"}}>{log.logout_time ? new Date(log.logout_time).toLocaleString() : "—"}</td>
                              <td className="px-4 py-3 font-mono text-right font-bold text-sm" style={{color:"var(--warning)"}}>{formatSecondsDuration(log.session_duration)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  )}
                </div>

              </div>
            ) : (
              <div className="enterprise-card p-16 flex items-center justify-center text-center">
                <div>
                  <div className="text-4xl mb-4">🔒</div>
                  <p className="font-bold uppercase text-sm" style={{color:"var(--text-muted)"}}>Access Restricted</p>
                  <p className="text-sm mt-1" style={{color:"var(--text-muted)"}}>Only Super Administrators can manage user accounts.</p>
                </div>
              </div>
            )}

            {/* Phase 6 Diagnostics & Backup panels - 7 Distinct Panels */}
            
            {/* PANEL 1: System Health Panel */}
            <div className="enterprise-card p-6 flex flex-col gap-4">
              <div className="flex items-center gap-3 border-b pb-4" style={{borderColor:"var(--border)"}}>
                <h4 className="section-heading font-extrabold uppercase" style={{color:"var(--text-primary)"}}>System Health</h4>
              </div>
              {systemHealth ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs uppercase">
                  {[
                    { name: "Database Service", key: "database", val: systemHealth.database },
                    { name: "Background Queue", key: "queue", val: systemHealth.queue },
                    { name: "Media Cloudinary Storage", key: "storage", val: systemHealth.storage },
                    { name: "Whisper Speech Engine", key: "speech", val: systemHealth.speech },
                  ].map((comp) => (
                    <div key={comp.key} className="bg-slate-950 border border-slate-850 p-3 flex items-center justify-between rounded-sm">
                      <span className="font-bold text-slate-400 text-[10px]">{comp.name}</span>
                      <span className={`px-2 py-0.5 rounded-sm font-black text-[9px] uppercase border ${
                        comp.val === "ok" || comp.val === "GREEN" ? "bg-emerald-950/40 text-emerald-400 border-emerald-800/60" : 
                        comp.val === "YELLOW" ? "bg-amber-950/40 text-amber-400 border-amber-800/60" :
                        "bg-rose-950/40 text-rose-450 border-rose-800/60"
                      }`}>
                        {comp.val}
                      </span>
                    </div>
                  ))}
                  <div className="col-span-1 sm:col-span-2 md:col-span-4 bg-slate-950 border border-slate-850 p-3 flex flex-col sm:flex-row sm:justify-between text-[10px] font-bold text-slate-500 rounded-sm gap-2">
                    <span>APP VERSION: <span className="font-mono text-white">{systemHealth.version}</span></span>
                    <span>DEPLOY TIME: <span className="font-mono text-amber-500">{new Date(systemHealth.deployment_timestamp).toLocaleString()}</span></span>
                  </div>
                </div>
              ) : (
                <div className="p-4 text-center text-slate-500 font-bold uppercase tracking-wider">Loading System Health...</div>
              )}

              {/* System Error Log List (Sub-section of System Health) */}
              <div className="mt-2 flex flex-col gap-2">
                <div className="flex items-center justify-between border-t border-slate-850 pt-3">
                  <span className="text-[10px] font-black uppercase text-slate-400">System Error Feed</span>
                  <div className="flex items-center gap-1">
                    {[
                      { label: "Today", val: "1" },
                      { label: "7 Days", val: "7" },
                      { label: "30 Days", val: "30" }
                    ].map((opt) => (
                      <button
                        key={opt.val}
                        onClick={() => {
                          setDiagnosticsDays(opt.val);
                          fetchDiagnostics(opt.val);
                        }}
                        className={`px-2 py-0.5 border text-[9px] uppercase font-bold cursor-pointer ${
                          diagnosticsDays === opt.val
                            ? "bg-amber-500 border-slate-950 text-slate-950"
                            : "bg-slate-950 border-slate-850 text-slate-400 hover:text-white"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {diagnostics ? (
                  <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 text-[9px] uppercase font-bold text-center">
                      {[
                        { label: "Speech", val: diagnostics.errors.counts.speech, color: "text-indigo-400 border-indigo-900" },
                        { label: "Queue", val: diagnostics.errors.counts.queue, color: "text-rose-450 border-rose-900" },
                        { label: "Auth", val: diagnostics.errors.counts.authentication, color: "text-amber-400 border-amber-900" },
                        { label: "Export", val: diagnostics.errors.counts.export, color: "text-cyan-400 border-cyan-900" },
                        { label: "General", val: diagnostics.errors.counts.general, color: "text-slate-400 border-slate-800" },
                      ].map((cat) => (
                        <div key={cat.label} className={`border bg-slate-950 py-1 rounded-sm ${cat.color}`}>
                          <div>{cat.label}</div>
                          <div className="text-sm font-black mt-0.5">{cat.val}</div>
                        </div>
                      ))}
                    </div>

                    <div className="border border-slate-850 overflow-y-auto max-h-36 text-[10px] divide-y divide-slate-850 font-mono">
                      {diagnostics.errors.recent.length === 0 ? (
                        <div className="p-4 text-center text-slate-500 font-bold uppercase font-sans">No errors logged in this period.</div>
                      ) : (
                        diagnostics.errors.recent.map((err) => (
                          <div key={err.id} className="p-2 hover:bg-slate-850/10 flex flex-col gap-0.5">
                            <div className="flex items-center justify-between">
                              <span className="font-black text-rose-455 uppercase text-[9px]">{err.error_type} error</span>
                              <span className="text-slate-500 text-[8px]">{new Date(err.created_at).toLocaleString()}</span>
                            </div>
                            <div className="text-slate-200 select-all font-sans">{err.message}</div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-2 text-center text-slate-500 font-bold uppercase tracking-wider">Loading System Errors...</div>
                )}
              </div>
            </div>

            {/* PANEL 2: Production Metrics Panel */}
            <div className="enterprise-card p-6 flex flex-col gap-4">
              <div className="flex items-center gap-3 border-b pb-4" style={{borderColor:"var(--border)"}}>
                <h4 className="section-heading font-extrabold uppercase" style={{color:"var(--text-primary)"}}>Production Metrics</h4>
              </div>
              {diagnostics ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs uppercase font-mono">
                  <div className="bg-slate-950 border border-slate-850 p-3 rounded-sm flex flex-col justify-between">
                    <span className="text-slate-500 font-sans font-bold text-[9px]">TOTAL REQUESTS</span>
                    <span className="text-lg font-black text-white mt-1">{diagnostics.api_metrics.total_requests}</span>
                  </div>
                  <div className="bg-slate-950 border border-slate-850 p-3 rounded-sm flex flex-col justify-between">
                    <span className="text-slate-500 font-sans font-bold text-[9px]">AVG API LATENCY</span>
                    <span className="text-lg font-black text-white mt-1">{diagnostics.api_metrics.avg_response_time} ms</span>
                  </div>
                  <div className="bg-slate-950 border border-slate-850 p-3 rounded-sm flex flex-col justify-between">
                    <span className="text-slate-500 font-sans font-bold text-[9px]">FAILED REQUESTS</span>
                    <span className="text-lg font-black text-rose-400 mt-1">{diagnostics.api_metrics.failed_requests}</span>
                  </div>
                  <div className="bg-slate-950 border border-slate-850 p-3 rounded-sm flex flex-col justify-between col-span-1 sm:col-span-2 md:col-span-1">
                    <span className="text-slate-500 font-sans font-bold text-[9px]">SLOWEST API PATH</span>
                    <span className="text-[10px] font-black text-amber-400 mt-1 truncate" title={diagnostics.api_metrics.slowest_endpoint}>
                      {diagnostics.api_metrics.slowest_endpoint}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-4 text-center text-slate-500 font-bold uppercase tracking-wider">Loading Production Metrics...</div>
              )}
            </div>

            {/* PANEL 3: Queue Diagnostics Panel */}
            <div className="enterprise-card p-6 flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4 gap-3" style={{borderColor:"var(--border)"}}>
                <h4 className="section-heading font-extrabold uppercase" style={{color:"var(--text-primary)"}}>Queue Diagnostics</h4>
                {diagnostics && (
                  <div className="flex flex-wrap items-center gap-4 text-[10px] uppercase font-bold text-slate-400 font-mono">
                    <span>Pending: <span className="text-amber-400">{diagnostics.queue_metrics.pending}</span></span>
                    <span>Running: <span className="text-cyan-400">{diagnostics.queue_metrics.running}</span></span>
                    <span>Completed: <span className="text-emerald-400">{diagnostics.queue_metrics.completed}</span></span>
                    <span>Failed: <span className="text-rose-500">{diagnostics.queue_metrics.failed}</span></span>
                  </div>
                )}
              </div>
              
              {diagnostics && (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 text-xs uppercase font-mono mb-2">
                  <div className="bg-slate-950 border border-slate-850 p-2.5 rounded-sm flex flex-col justify-between">
                    <span className="text-slate-500 font-sans font-bold text-[8px]">Oldest Pending Age</span>
                    <span className="text-sm font-black text-white mt-1">{diagnostics.queue_metrics.oldest_pending_age} s</span>
                  </div>
                  <div className="bg-slate-950 border border-slate-850 p-2.5 rounded-sm flex flex-col justify-between">
                    <span className="text-slate-500 font-sans font-bold text-[8px]">Failed (24h)</span>
                    <span className="text-sm font-black text-rose-455 mt-1">{diagnostics.queue_metrics.failed_last_24h}</span>
                  </div>
                  <div className="bg-slate-950 border border-slate-850 p-2.5 rounded-sm flex flex-col justify-between">
                    <span className="text-slate-500 font-sans font-bold text-[8px]">Retry Count</span>
                    <span className="text-sm font-black text-amber-500 mt-1">{diagnostics.queue_metrics.retry_count}</span>
                  </div>
                  <div className="bg-slate-950 border border-slate-850 p-2.5 rounded-sm flex flex-col justify-between">
                    <span className="text-slate-500 font-sans font-bold text-[8px]">Retry Rate</span>
                    <span className="text-sm font-black text-amber-400 mt-1">{diagnostics.queue_metrics.retry_percentage}%</span>
                  </div>
                  <div className="bg-slate-950 border border-slate-850 p-2.5 rounded-sm flex flex-col justify-between">
                    <span className="text-slate-500 font-sans font-bold text-[8px]">Avg Wait Time</span>
                    <span className="text-sm font-black text-cyan-400 mt-1">{diagnostics.queue_metrics.avg_wait_time} s</span>
                  </div>
                  <div className="bg-slate-950 border border-slate-850 p-2.5 rounded-sm flex flex-col justify-between">
                    <span className="text-slate-500 font-sans font-bold text-[8px]">Avg Processing</span>
                    <span className="text-sm font-black text-emerald-400 mt-1">{diagnostics.queue_metrics.avg_processing_time} s</span>
                  </div>
                  <div className="bg-slate-950 border border-slate-850 p-2.5 rounded-sm flex flex-col justify-between col-span-2">
                    <span className="text-slate-500 font-sans font-bold text-[8px]">Processing Rate</span>
                    <span className="text-sm font-black text-indigo-400 mt-1">{diagnostics.queue_metrics.processing_rate} /min</span>
                  </div>
                  <div className="bg-slate-950 border border-slate-850 p-2.5 rounded-sm flex flex-col justify-between col-span-2 sm:col-span-4">
                    <span className="text-slate-500 font-sans font-bold text-[8px]">Throughput per Hour</span>
                    <span className="text-sm font-black text-emerald-400 mt-1">{diagnostics.queue_metrics.throughput_per_hour} jobs</span>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto border border-slate-850 max-h-48 overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs dashboard-table font-medium">
                  <thead>
                    <tr className="bg-slate-950 text-slate-350 border-b border-slate-850">
                      <th className="p-2 font-black uppercase">Complaint Ticket</th>
                      <th className="p-2 font-black uppercase">Exception message</th>
                      <th className="p-2 font-black uppercase">Traceback Summary</th>
                      <th className="p-2 font-black uppercase text-center">Attempt</th>
                      <th className="p-2 font-black uppercase text-right">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850 font-mono text-[10px]">
                    {!diagnostics || diagnostics.queue_failures.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="p-4 text-center text-slate-500 font-bold uppercase font-sans">
                          No failed queue jobs logged.
                        </td>
                      </tr>
                    ) : (
                      diagnostics.queue_failures.map((fail) => (
                        <tr key={fail.id} className="hover:bg-slate-850/20 text-slate-300">
                          <td className="p-2 font-bold text-white font-sans">{fail.complaint_ref}</td>
                          <td className="p-2 text-rose-455 font-sans break-all max-w-[150px]">{fail.exception_message}</td>
                          <td className="p-2 whitespace-pre-wrap select-all max-w-xs truncate" title={fail.traceback_summary}>
                            {fail.traceback_summary.substring(0, 80)}...
                          </td>
                          <td className="p-2 text-center font-bold text-amber-500 font-sans">{fail.attempt_count}</td>
                          <td className="p-2 text-right text-slate-400 font-sans">{new Date(fail.failed_at).toLocaleString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* PANEL 4: Speech Health Panel */}
            <div className="bg-slate-900 border border-slate-800 p-5 shadow-lg flex flex-col gap-4">
              <div className="flex items-center gap-2 border-b border-slate-850 pb-2">
                <span className="text-lg">🎙️</span>
                <h4 className="text-xs font-black uppercase tracking-wider text-white">4. Speech Health Panel</h4>
              </div>
              {diagnostics ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs uppercase font-mono">
                  <div className="bg-slate-950 border border-slate-850 p-3 rounded-sm flex flex-col justify-between">
                    <span className="text-slate-500 font-sans font-bold text-[9px]">SPEECH SUCCESS RATE</span>
                    <span className="text-lg font-black text-emerald-400 mt-1">{diagnostics.speech_metrics.success_rate}%</span>
                  </div>
                  <div className="bg-slate-950 border border-slate-850 p-3 rounded-sm flex flex-col justify-between">
                    <span className="text-slate-500 font-sans font-bold text-[9px]">SPEECH RETRY RATE</span>
                    <span className="text-lg font-black text-indigo-400 mt-1">{diagnostics.speech_metrics.retry_rate}%</span>
                  </div>
                  <div className="bg-slate-950 border border-slate-850 p-3 rounded-sm flex flex-col justify-between">
                    <span className="text-slate-500 font-sans font-bold text-[9px]">SPEECH FAILURE RATE</span>
                    <span className="text-lg font-black text-rose-500 mt-1">{diagnostics.speech_metrics.failure_rate}%</span>
                  </div>
                  <div className="bg-slate-950 border border-slate-850 p-3 rounded-sm flex flex-col justify-between">
                    <span className="text-slate-500 font-sans font-bold text-[9px]">AVG SPEECH PROC TIME</span>
                    <span className="text-lg font-black text-white mt-1">{diagnostics.speech_metrics.avg_processing_time} ms</span>
                  </div>
                </div>
              ) : (
                <div className="p-4 text-center text-slate-500 font-bold uppercase tracking-wider">Loading Speech Health...</div>
              )}
            </div>

            {/* PANEL 5: Media Health Panel */}
            <div className="bg-slate-900 border border-slate-800 p-5 shadow-lg flex flex-col gap-4">
              <div className="flex items-center gap-2 border-b border-slate-850 pb-2">
                <span className="text-lg">☁️</span>
                <h4 className="text-xs font-black uppercase tracking-wider text-white">5. Media Health Panel</h4>
              </div>
              {systemHealth ? (
                <div className="flex flex-col gap-3">
                  <div className="bg-slate-950 border border-slate-850 p-4 rounded-sm flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-black text-slate-400 uppercase">Cloudinary Storage Status</span>
                      <span className="text-xs font-bold text-slate-500 normal-case">
                        Verifies credentials and runs write-read-delete active verification tests.
                      </span>
                    </div>
                    <span className={`px-3 py-1 rounded-sm font-black text-xs uppercase border ${
                      systemHealth.storage === "GREEN" ? "bg-emerald-950/40 text-emerald-400 border-emerald-800/60" :
                      systemHealth.storage === "YELLOW" ? "bg-amber-950/40 text-amber-400 border-amber-800/60" :
                      "bg-rose-950/40 text-rose-450 border-rose-800/60"
                    }`}>
                      {systemHealth.storage}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-4 text-center text-slate-500 font-bold uppercase tracking-wider">Loading Media Health...</div>
              )}
            </div>

            {/* PANEL 6: Security Audit Panel */}
            <div className="bg-slate-900 border border-slate-800 p-5 shadow-lg flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🛡️</span>
                  <h4 className="text-xs font-black uppercase tracking-wider text-white">6. Security Audit Panel</h4>
                </div>
              </div>
              {diagnostics ? (
                <div className="flex flex-col gap-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[9px] uppercase font-bold text-center">
                    {[
                      { label: "Failed Logins", val: diagnostics.security.failed_logins, color: "text-amber-400 border-amber-900" },
                      { label: "Locked Accts", val: diagnostics.security.locked_accounts, color: "text-red-400 border-red-900" },
                      { label: "Rate Limits", val: diagnostics.security.rate_limited_requests, color: "text-rose-450 border-rose-900" },
                      { label: "Suspicious", val: diagnostics.security.suspicious_activities, color: "text-indigo-400 border-indigo-900" },
                    ].map((sec) => (
                      <div key={sec.label} className={`border bg-slate-950 py-2 rounded-sm ${sec.color}`}>
                        <div>{sec.label}</div>
                        <div className="text-sm font-black mt-0.5">{sec.val}</div>
                      </div>
                    ))}
                  </div>

                  <div className="border border-slate-850 overflow-y-auto max-h-48 text-[10px] divide-y divide-slate-850 font-mono">
                    {diagnostics.security.events.length === 0 ? (
                      <div className="p-4 text-center text-slate-500 font-bold uppercase font-sans">No security events logged.</div>
                    ) : (
                      diagnostics.security.events.map((ev) => (
                        <div key={ev.id} className="p-2 hover:bg-slate-850/10 flex flex-col gap-0.5">
                          <div className="flex items-center justify-between">
                            <span className="font-black text-amber-400 uppercase text-[9px]">{ev.event_type}</span>
                            <span className="text-slate-500 text-[8px]">{new Date(ev.created_at).toLocaleString()}</span>
                          </div>
                          <div className="text-slate-200 font-sans">{ev.details}</div>
                          {ev.ip_address && <div className="text-indigo-400 text-[8px]">IP: {ev.ip_address} {ev.username && `| Admin: ${ev.username}`}</div>}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-4 text-center text-slate-500 font-bold uppercase tracking-wider">Loading Security Events...</div>
              )}
            </div>

            {/* PANEL 7: Backup History & Recovery Panel */}
            <div className="bg-slate-900 border border-slate-800 p-5 shadow-lg flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-850 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🗄️</span>
                  <h4 className="text-xs font-black uppercase tracking-wider text-white">7. Backup History & Recovery Panel</h4>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleTriggerBackup("database")}
                    disabled={triggeringBackup || restoringBackup}
                    className="px-3 py-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 text-[10px] font-black uppercase border border-slate-950 cursor-pointer shadow-sm active:translate-y-0.5 transition-all"
                  >
                    {triggeringBackup ? "⏳ backing up..." : "💾 Backup Database"}
                  </button>
                  <button
                    onClick={() => handleTriggerBackup("media")}
                    disabled={triggeringBackup || restoringBackup}
                    className="px-3 py-1 bg-slate-850 hover:bg-slate-800 border border-slate-750 disabled:opacity-50 text-slate-200 text-[10px] font-black uppercase cursor-pointer shadow-sm active:translate-y-0.5 transition-all"
                  >
                    💾 Backup Media Files
                  </button>
                </div>
              </div>

              {backupActionMsg && (
                <div className={`p-2 text-xs border font-bold uppercase tracking-wider text-center ${
                  backupActionMsg.toLowerCase().includes("fail") 
                    ? "bg-rose-950/40 text-rose-455 border-rose-800" 
                    : "bg-emerald-950/40 text-emerald-400 border-emerald-800"
                }`}>
                  {backupActionMsg}
                </div>
              )}

              <div className="overflow-x-auto border border-slate-850 max-h-48 overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs dashboard-table font-medium">
                  <thead>
                    <tr className="bg-slate-950 text-slate-350 border-b border-slate-850">
                      <th className="p-2 font-black uppercase">Backup Archive name</th>
                      <th className="p-2 font-black uppercase">Backup Type</th>
                      <th className="p-2 font-black uppercase">File Size</th>
                      <th className="p-2 font-black uppercase text-center">Validation Status</th>
                      <th className="p-2 font-black uppercase text-center">Restore tested</th>
                      <th className="p-2 font-black uppercase">Created Date</th>
                      <th className="p-2 font-black uppercase text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850 font-mono text-[10px]">
                    {!diagnostics || diagnostics.backups.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="p-4 text-center text-slate-500 font-bold uppercase font-sans">
                          No backup archives registered.
                        </td>
                      </tr>
                    ) : (
                      diagnostics.backups.map((bak) => (
                        <tr key={bak.id} className="hover:bg-slate-850/20 text-slate-300">
                          <td className="p-2 font-bold text-white font-sans">{bak.file_name}</td>
                          <td className="p-2 text-indigo-400 uppercase font-sans font-bold text-[9px]">{bak.backup_type}</td>
                          <td className="p-2 text-slate-400 font-sans">{(bak.file_size/1024).toFixed(1)} KB</td>
                          <td className="p-2 text-center">
                            <span className={`px-2 py-0.5 rounded-sm font-black text-[9px] uppercase border ${
                              bak.status === "SUCCESS" 
                                ? "bg-emerald-950/40 text-emerald-400 border-emerald-800/60" 
                                : "bg-rose-950/40 text-rose-455 border-rose-800/60"
                            }`}>
                              {bak.status}
                            </span>
                          </td>
                          <td className="p-2 text-center font-bold font-sans">
                            {bak.restore_tested ? (
                              <span className="text-emerald-400 text-[10px]">✓ Yes</span>
                            ) : (
                              <span className="text-slate-500 text-[10px]">No</span>
                            )}
                          </td>
                          <td className="p-2 text-slate-400 font-sans">{new Date(bak.created_at).toLocaleString()}</td>
                          <td className="p-2 text-right font-sans">
                            {bak.backup_type === "database" && bak.status === "SUCCESS" && (
                              <button
                                onClick={() => handleRestoreBackup(bak.file_name)}
                                disabled={triggeringBackup || restoringBackup}
                                className="px-2 py-1 bg-slate-850 hover:bg-rose-950/40 border border-slate-750 hover:border-rose-900 text-rose-400 hover:text-rose-350 disabled:opacity-50 text-[9px] font-black uppercase cursor-pointer transition-all active:scale-95"
                              >
                                Restore
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

      </main>

      {/* COMPLAINT DETAIL MODAL */}
      {selectedComplaint && (
        <div className="fixed inset-0 bg-black/85 z-[60] flex items-center justify-center p-4 md:p-8 backdrop-blur-sm transition-opacity duration-200">
          <div className="w-full max-w-[1120px] p-10 shadow-2xl relative flex flex-col gap-8 max-h-[92vh] overflow-y-auto admin-modal dashboard-modal modal-scroll rounded-2xl">
            
            {/* Close modal X button */}
            <button
              onClick={() => {
                setSelectedComplaint(null);
                document.body.style.overflow = "";
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white font-black text-xl hover:bg-slate-800 p-1 w-8 h-8 flex items-center justify-center border border-slate-800 cursor-pointer z-10"
            >
              ✕
            </button>

            {/* Next and Previous complaint details navigation */}
            <div className="flex items-center justify-between gap-4 mt-2 select-none border-b border-slate-850 pb-4 pr-12">
              <button
                onClick={() => navigateComplaintDetail("prev")}
                disabled={(() => {
                  const list = (expandedChart && expandedAnalytics?.drilldown_complaints) ? expandedAnalytics.drilldown_complaints : complaintsData.results;
                  return list.findIndex((c) => c.id === selectedComplaint.id) <= 0;
                })()}
                className={`px-5 py-2.5 text-sm font-extrabold uppercase border rounded-lg flex items-center gap-2 min-w-[160px] justify-center ${
                  (() => {
                    const list = (expandedChart && expandedAnalytics?.drilldown_complaints) ? expandedAnalytics.drilldown_complaints : complaintsData.results;
                    return list.findIndex((c) => c.id === selectedComplaint.id) <= 0;
                  })()
                    ? "bg-slate-900 border-slate-850 text-slate-600 cursor-not-allowed opacity-50"
                    : "bg-slate-800 hover:bg-slate-700 text-white border-slate-750 cursor-pointer active:scale-95"
                }`}
              >
                ◀ Previous
              </button>

              <span className="text-sm font-bold text-slate-400 text-center flex-shrink-0">
                Ticket{" "}
                <span className="font-black text-white">
                  {(() => {
                    const list = (expandedChart && expandedAnalytics?.drilldown_complaints) ? expandedAnalytics.drilldown_complaints : complaintsData.results;
                    return list.findIndex((c) => c.id === selectedComplaint.id) + 1;
                  })()}
                </span>
                {" "}/ {((expandedChart && expandedAnalytics?.drilldown_complaints) ? expandedAnalytics.drilldown_complaints : complaintsData.results).length}
              </span>

              <button
                onClick={() => navigateComplaintDetail("next")}
                disabled={(() => {
                  const list = (expandedChart && expandedAnalytics?.drilldown_complaints) ? expandedAnalytics.drilldown_complaints : complaintsData.results;
                  const idx = list.findIndex((c) => c.id === selectedComplaint.id);
                  return idx === -1 || idx >= list.length - 1;
                })()}
                className={`px-5 py-2.5 text-sm font-extrabold uppercase border rounded-lg flex items-center gap-2 min-w-[160px] justify-center ${
                  (() => {
                    const list = (expandedChart && expandedAnalytics?.drilldown_complaints) ? expandedAnalytics.drilldown_complaints : complaintsData.results;
                    const idx = list.findIndex((c) => c.id === selectedComplaint.id);
                    return idx === -1 || idx >= list.length - 1;
                  })()
                    ? "bg-slate-900 border-slate-850 text-slate-600 cursor-not-allowed opacity-50"
                    : "bg-slate-800 hover:bg-slate-700 text-white border-slate-750 cursor-pointer active:scale-95"
                }`}
              >
                Next ▶
              </button>
            </div>

            {/* Read-Only Prominent Reference Number Field at the Top */}
            <div className="pb-4 flex flex-col gap-2">
              <span className="text-sm font-extrabold uppercase text-amber-500 tracking-widest">
                Complaint Reference ID
              </span>
              <div className="text-4xl font-black text-white tracking-tight font-mono select-all modal-title">
                {selectedComplaint.reference_number}
              </div>
            </div>

            {/* Main Detail Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-base">
              <div className="flex flex-col gap-2 bg-slate-950 p-5 border border-slate-850 rounded-lg">
                <span className="font-extrabold uppercase text-slate-500 modal-label">Associated Project</span>
                <span className="font-bold text-slate-200 text-lg">{selectedComplaint.project_name}</span>
              </div>

              <div className="flex flex-col gap-2 bg-slate-950 p-5 border border-slate-850 rounded-lg">
                <span className="font-extrabold uppercase text-slate-500 modal-label">Business Unit</span>
                <span className="font-bold text-slate-200 text-lg">{selectedComplaint.business_unit || "—"}</span>
              </div>

              <div className="flex flex-col gap-2 bg-slate-950 p-5 border border-slate-850 rounded-lg">
                <span className="font-extrabold uppercase text-slate-500 modal-label">Camp Location</span>
                <span className="font-bold text-slate-200 text-lg">{selectedComplaint.location_name}</span>
              </div>

              <div className="flex flex-col gap-2 bg-slate-950 p-5 border border-slate-850 rounded-lg">
                <span className="font-black uppercase text-slate-500">Issue Category</span>
                <span className="font-bold text-amber-500 uppercase text-lg">{selectedComplaint.category}</span>
              </div>

              <div className="flex flex-col gap-2 bg-slate-950 p-5 border border-slate-850 rounded-lg">
                <span className="font-black uppercase text-slate-500">Submitted Language</span>
                <span className="font-bold text-slate-200 uppercase font-mono text-lg">{selectedComplaint.language}</span>
              </div>

              <div className="flex flex-col gap-2 bg-slate-950 p-5 border border-slate-850 rounded-lg">
                <span className="font-black uppercase text-slate-500">Logged Timestamp</span>
                <span className="font-bold text-slate-200 text-lg">
                  {new Date(selectedComplaint.created_at).toLocaleString()}
                </span>
              </div>

              <div className="flex flex-col gap-2 bg-slate-950 p-5 border border-slate-850 rounded-lg">
                <span className="font-black uppercase text-slate-500">Last Modified</span>
                <span className="font-bold text-slate-200 text-lg">
                  {new Date(selectedComplaint.updated_at).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Speech Intelligence & Translation Panel */}
            {(selectedComplaint.has_audio || selectedComplaint.submission_type !== "TEXT" || selectedComplaint.transcript || selectedComplaint.original_text) && (
              <div className="flex flex-col gap-5 bg-slate-950 p-5 border border-slate-850 text-sm rounded-xl">
                <div className="flex items-center justify-between border-b border-slate-850 pb-3 flex-wrap gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-black uppercase text-slate-100 tracking-wider">🎙️ Speech Intelligence & Translation</span>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 uppercase font-bold">Speech STT:</span>
                      {(() => {
                        const status = selectedComplaint.transcription_status || "PENDING";
                        let badgeStyle = "bg-slate-800 text-slate-400 border border-slate-700";
                        if (status === "PROCESSING") badgeStyle = "bg-blue-600/20 text-blue-400 border border-blue-500/30";
                        else if (status === "RETRYING") badgeStyle = "bg-amber-600/20 text-amber-400 border border-amber-500/30 animate-pulse";
                        else if (status === "COMPLETED") badgeStyle = "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30";
                        else if (status === "FAILED") badgeStyle = "bg-rose-600/20 text-rose-400 border border-rose-500/30";
                        return <span className={`text-xs font-black uppercase px-3 py-1 rounded-md ${badgeStyle}`}>{status}</span>;
                      })()}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 uppercase font-bold">Translate:</span>
                      {(() => {
                        const status = selectedComplaint.translation_status || "PENDING";
                        let badgeStyle = "bg-slate-800 text-slate-400 border border-slate-700";
                        if (status === "COMPLETED") badgeStyle = "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30";
                        else if (status === "FAILED") badgeStyle = "bg-rose-600/20 text-rose-400 border border-rose-500/30";
                        return <span className={`text-xs font-black uppercase px-3 py-1 rounded-md ${badgeStyle}`}>{status}</span>;
                      })()}
                    </div>
                  </div>
                </div>

                {/* Speech Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-900/50 p-4 border border-slate-900 rounded-lg">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-bold text-slate-500 uppercase">Worker Selected Lang</span>
                    <span className="font-bold text-slate-200 uppercase font-mono text-sm">
                      {selectedComplaint.worker_selected_language ? (languageNames[selectedComplaint.worker_selected_language.toLowerCase()] || selectedComplaint.worker_selected_language) : "N/A"}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-bold text-slate-500 uppercase">Detected Language</span>
                    <span className="font-bold text-slate-200 uppercase font-mono text-sm">
                      {selectedComplaint.detected_language ? (languageNames[selectedComplaint.detected_language.toLowerCase()] || selectedComplaint.detected_language) : "N/A"}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-bold text-slate-500 uppercase">Translation Lang Pair</span>
                    <span className="font-bold text-slate-200 font-mono text-sm">
                      {selectedComplaint.translation_language_pair || "N/A"}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-bold text-slate-500 uppercase">Speech Confidence</span>
                    <span className="font-bold text-slate-200 text-sm">
                      {selectedComplaint.transcript_confidence ? `${Math.round(selectedComplaint.transcript_confidence * 100)}%` : "N/A"}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-bold text-slate-500 uppercase">Translation Confidence</span>
                    <span className="font-bold text-slate-200 text-sm">
                      {selectedComplaint.translation_confidence ? `${Math.round(selectedComplaint.translation_confidence * 100)}%` : "N/A"}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-bold text-slate-500 uppercase">Verification Result</span>
                    <span className={`font-bold uppercase text-sm ${selectedComplaint.translation_verification_result === 'VERIFIED' ? 'text-emerald-400' : selectedComplaint.translation_verification_result === 'MISMATCH_REPLACED' ? 'text-rose-400' : 'text-amber-400'}`}>
                      {selectedComplaint.translation_verification_result || "N/A"}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-bold text-slate-500 uppercase">Processing Duration</span>
                    <span className="font-bold text-slate-200 text-sm">
                      {selectedComplaint.speech_processing_duration_ms ? `${selectedComplaint.speech_processing_duration_ms} ms` : "N/A"}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-bold text-slate-500 uppercase">Audio Duration</span>
                    <span className="font-bold text-slate-200 font-mono text-sm">
                      {selectedComplaint.audio_duration_seconds ? `${selectedComplaint.audio_duration_seconds.toFixed(1)}s` : "N/A"}
                    </span>
                  </div>
                </div>

                {/* Transcripts: Original and Translated Side-by-Side/Stack */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                  <div className="flex flex-col bg-slate-900 p-4 border border-slate-850 rounded-lg relative group">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-black uppercase text-slate-400 text-sm">Original Transcript</span>
                      <button
                        onClick={() => {
                          const text = selectedComplaint.transcript || selectedComplaint.original_text || "";
                          navigator.clipboard.writeText(text);
                          setCopiedTranscript(true);
                          setTimeout(() => setCopiedTranscript(false), 2000);
                        }}
                        className="text-xs font-black uppercase tracking-wider text-amber-500 hover:text-amber-400 cursor-pointer"
                      >
                        {copiedTranscript ? "Copied! ✓" : "Copy"}
                      </button>
                    </div>
                    <p className="text-slate-200 italic font-medium leading-relaxed bg-slate-950 p-3 border border-slate-900 rounded-lg min-h-[80px] select-all text-sm">
                      {selectedComplaint.transcript || selectedComplaint.original_text || (selectedComplaint.transcription_status === "PROCESSING" ? "Transcribing voice recording..." : "No speech transcript available.")}
                    </p>
                  </div>

                  <div className="flex flex-col bg-slate-900 p-4 border border-slate-850 rounded-lg relative group">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-black uppercase text-amber-500 text-sm">English AI Translation</span>
                      <button
                        onClick={() => {
                          const text = selectedComplaint.english_translation || "";
                          navigator.clipboard.writeText(text);
                          setCopiedTranslation(true);
                          setTimeout(() => setCopiedTranslation(false), 2000);
                        }}
                        className="text-xs font-black uppercase tracking-wider text-amber-500 hover:text-amber-400 cursor-pointer"
                      >
                        {copiedTranslation ? "Copied! ✓" : "Copy"}
                      </button>
                    </div>
                    <p className="text-yellow-50 italic font-medium leading-relaxed bg-slate-950 p-3 border border-slate-900 rounded-lg min-h-[80px] select-all text-sm">
                      {selectedComplaint.english_translation || (selectedComplaint.translation_status === "PROCESSING" ? "Translating text..." : "No English translation available.")}
                    </p>
                  </div>
                </div>

                {/* Error Callout */}
                {selectedComplaint.transcription_status === "FAILED" && selectedComplaint.transcription_error && (
                  <div className="bg-rose-950/40 text-rose-300 border border-rose-900/50 p-4 rounded-lg font-medium">
                    <span className="font-black uppercase text-rose-400 block text-xs mb-1">Pipeline Error Log</span>
                    {selectedComplaint.transcription_error}
                  </div>
                )}

                {/* STT / Translation Actions */}
                <div className="flex gap-2 justify-end mt-1 flex-wrap">
                  <button
                    onClick={() => handleDownloadTranscript(selectedComplaint)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold uppercase text-[10px] border border-slate-750 transition-colors cursor-pointer rounded-sm"
                  >
                    Download Transcript (.txt)
                  </button>
                  <button
                    disabled={isReprocessingSingle || selectedComplaint.transcription_status === "PROCESSING" || selectedComplaint.transcription_status === "RETRYING"}
                    onClick={() => handleReprocessSingle(selectedComplaint.id)}
                    className={`px-3 py-1.5 font-bold uppercase text-[10px] border transition-colors rounded-sm ${
                      isReprocessingSingle || selectedComplaint.transcription_status === "PROCESSING" || selectedComplaint.transcription_status === "RETRYING"
                        ? "bg-slate-900 text-slate-600 border-slate-850 cursor-not-allowed"
                        : "bg-amber-500 hover:bg-amber-600 text-slate-950 border-amber-600 cursor-pointer"
                    }`}
                  >
                    {isReprocessingSingle ? "Queueing..." : "Reprocess Transcript"}
                  </button>
                </div>

                {/* Interactive SpeechProcessingLog attempt timeline */}
                <div className="border-t border-slate-850 pt-3 mt-1">
                  <span className="text-[10px] font-black uppercase text-slate-500 block mb-2.5">Speech Pipeline Process Audit Timeline</span>
                  
                  {(!selectedComplaint.speech_logs || selectedComplaint.speech_logs.length === 0) ? (
                    <div className="text-[10px] font-bold text-slate-600 italic">No execution attempts have been logged for this speech task.</div>
                  ) : (
                    <div className="flex flex-col gap-2.5 pl-2 relative border-l border-slate-850">
                      {selectedComplaint.speech_logs.map((log, idx) => {
                        let statusColor = "text-slate-400";
                        let dotColor = "bg-slate-700";
                        if (log.status === "COMPLETED" || log.status === "SUCCESS") {
                          statusColor = "text-emerald-400";
                          dotColor = "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]";
                        } else if (log.status === "FAILED") {
                          statusColor = "text-rose-400";
                          dotColor = "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]";
                        } else if (log.status === "RETRYING" || log.status === "PROCESSING") {
                          statusColor = "text-amber-400";
                          dotColor = "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)] animate-pulse";
                        }
                        
                        return (
                          <div key={log.id || idx} className="relative flex flex-col gap-0.5 text-[10px]">
                            {/* Dot on the timeline line */}
                            <div className={`absolute -left-[12.5px] top-1 w-2.5 h-2.5 rounded-full ${dotColor}`} />
                            
                            <div className="flex items-center justify-between flex-wrap gap-x-2">
                              <span className="font-black text-slate-300">
                                Attempt #{log.attempt_number} <span className={`uppercase ml-1.5 font-bold ${statusColor}`}>{log.status}</span>
                              </span>
                              <span className="text-[9px] text-slate-500 font-mono">
                                {new Date(log.created_at).toLocaleString()}
                              </span>
                            </div>
                            
                            {log.processing_time_ms && (
                              <div className="text-[9px] text-slate-400 font-mono">
                                Execution Duration: <span className="font-bold text-slate-300">{log.processing_time_ms.toLocaleString()} ms</span>
                              </div>
                            )}
                            
                            {log.error_message && (
                              <div className="bg-slate-900 border border-slate-850 p-1.5 rounded-sm mt-1 text-slate-400 font-mono break-all whitespace-pre-wrap text-[9px]">
                                {log.error_message}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Media Evidence Attachments: Photo and seekable Audio Player */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* Photo Preview Column */}
              <div className="flex flex-col gap-3">
                <span className="font-extrabold uppercase text-slate-500 text-sm">
                  Photo Attachment (Click to Zoom)
                </span>
                {selectedComplaint.photo_url ? (
                  <div className="w-full h-48 border border-slate-800 bg-black relative group overflow-hidden flex items-center justify-center rounded-lg">
                    <img
                      src={selectedComplaint.photo_url}
                      alt="Complaint attachment"
                      className="object-contain w-full h-full cursor-zoom-in transition-all duration-200 hover:scale-105"
                      onClick={() => {
                        setLightboxUrl(selectedComplaint.photo_url);
                        setZoomScale(1);
                      }}
                      onError={(e) => {
                        e.target.style.display = "none";
                        e.target.parentElement.innerHTML = "<div style='color:#64748b;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;padding:16px;text-align:center'>⚠ Image Unavailable<br/><span style=\"font-size:12px;font-weight:500;margin-top:4px;display:block;\">The file may have been removed or is inaccessible</span></div>";
                      }}
                    />
                    <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none text-white text-sm font-bold uppercase tracking-widest">
                      🔍 Click to Expand
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-48 border border-slate-850 bg-slate-950 flex items-center justify-center text-slate-600 font-bold uppercase text-sm tracking-wider select-none rounded-lg">
                    No photo attached
                  </div>
                )}
              </div>

              {/* Embedded Customized Seekable Audio Player Column */}
              <div className="flex flex-col gap-3">
                <span className="font-extrabold uppercase text-slate-500 text-sm">
                  Voice Clip Player
                </span>
                {selectedComplaint.audio_url ? (
                  <div className="w-full border border-slate-800 bg-slate-950 flex flex-col p-5 gap-4 min-h-[160px] rounded-lg">

                    <audio
                      ref={audioElRef}
                      src={selectedComplaint.audio_url}
                      onPlay={() => setAudioIsPlaying(true)}
                      onPause={() => setAudioIsPlaying(false)}
                      onTimeUpdate={handleAudioTimeUpdate}
                      onLoadedMetadata={handleAudioLoadedMetadata}
                      onError={() => {
                        // Mark audio as unavailable — prevents broken player
                        setAudioIsPlaying(false);
                      }}
                      className="hidden"
                    />

                    <div className="w-full flex items-center gap-4">
                      <button
                        onClick={handleAudioPlayToggle}
                        className="bg-blue-600 hover:bg-blue-500 text-white font-black w-12 h-12 flex items-center justify-center rounded-full transition-transform active:scale-95 cursor-pointer text-lg flex-shrink-0 shadow-lg"
                      >
                        {audioIsPlaying ? "⏸" : "▶"}
                      </button>

                      <div className="flex-1 flex flex-col gap-2">
                        <input
                          type="range"
                          min="0"
                          max={audioDuration || 100}
                          value={audioCurrentTime}
                          onChange={handleAudioSeek}
                          className="w-full h-2.5 bg-slate-700 accent-blue-500 rounded-lg cursor-pointer outline-none"
                        />
                        <div className="flex justify-between text-xs text-slate-400 font-mono font-semibold">
                          <span>{formatAudioTime(audioCurrentTime)}</span>
                          <span>{formatAudioTime(audioDuration)}</span>
                        </div>
                      </div>
                    </div>

                    {selectedComplaint.audio_duration_seconds && (
                      <div className="text-xs text-slate-500 font-semibold">
                        Duration: <span className="text-slate-300 font-bold">{selectedComplaint.audio_duration_seconds.toFixed(1)}s</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-full border border-slate-850 bg-slate-950 flex items-center justify-center text-slate-600 font-bold uppercase text-sm tracking-wider min-h-[160px] select-none rounded-lg">
                    No voice recording attached
                  </div>
                )}
              </div>

            </div>

            {/* Workflow status history timeline progression */}
            <div className="bg-slate-950 border border-slate-850 p-5 flex flex-col gap-4 rounded-lg">
              <span className="text-sm font-black uppercase text-slate-500">
                Workflow status progression path
              </span>

              {loadingHistory ? (
                <div className="text-sm font-bold text-slate-500 animate-pulse uppercase">
                  Loading timeline history...
                </div>
              ) : complaintHistory.length === 0 ? (
                <div className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-glow"></span>
                  <div className="flex flex-col text-sm">
                    <span className="font-bold text-white uppercase">Status: Pending</span>
                    <span className="text-xs text-slate-500">Created: {new Date(selectedComplaint.created_at).toLocaleString()}</span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-4 pl-1 relative border-l border-slate-800 ml-1.5">
                  {/* Origin */}
                  <div className="flex items-start gap-3 relative -left-[4.5px]">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-700 border border-slate-950 mt-1 flex-shrink-0"></span>
                    <div className="flex flex-col text-sm">
                      <span className="font-black text-slate-400 uppercase">Registered: Pending</span>
                      <span className="text-xs text-slate-500">{new Date(selectedComplaint.created_at).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* History Logs */}
                  {complaintHistory.map((h, i) => {
                    const isLast = i === complaintHistory.length - 1;
                    return (
                      <div key={h.id} className="flex items-start gap-3 relative -left-[4.5px]">
                        <span className={`w-2.5 h-2.5 rounded-full border border-slate-950 mt-1 flex-shrink-0 ${isLast ? "bg-amber-500 shadow-glow" : "bg-slate-700"}`}></span>
                        <div className="flex flex-col text-sm">
                          <span className={`font-black uppercase ${isLast ? "text-amber-400" : "text-slate-300"}`}>
                            Changed status: {h.new_status}
                          </span>
                          <span className="text-xs text-slate-500">
                            {new Date(h.timestamp).toLocaleString()} by <span className="text-white font-mono font-bold">{h.updated_by_username || "system"}</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Status updates action footer (CSS padding and right margins fixed) */}
            <div className="border-t border-slate-850 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-1 select-none">
              
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-black uppercase text-slate-500">
                  Update Workflow Status
                </span>
                <span className="text-xs font-bold text-slate-350">
                  Current:{" "}
                  <span className="font-black text-white uppercase">{selectedComplaint.status}</span>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={selectedComplaint.status}
                  disabled={updatingStatusState}
                  onChange={(e) => handleUpdateStatus(e.target.value)}
                  className="bg-slate-950 text-slate-100 py-2.5 pl-3.5 pr-10 text-xs font-bold uppercase border border-slate-850 rounded-sm appearance-none cursor-pointer outline-none focus:border-amber-500"
                  style={{
                    backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23f59e0b' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 0.8rem center",
                    backgroundSize: "0.8em"
                  }}
                >
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Rejected">Rejected</option>
                </select>

                {updatingStatusState && (
                  <span className="animate-spin text-sm">⏳</span>
                )}
              </div>

            </div>

          </div>
        </div>
      )}

      {/* FULLSCREEN IMAGE VIEWER — portal renders above all modals */}
      {lightboxUrl && (
        <FullscreenImageViewer
          url={lightboxUrl}
          zoomScale={zoomScale}
          onZoomChange={setZoomScale}
          onClose={() => { setLightboxUrl(null); setZoomScale(1); }}
        />
      )}

      {/* SLIDING NOTIFICATION SIDE DRAWER */}
      {showNotificationsDrawer && (
        <div className="fixed inset-0 bg-black/60 z-45 flex justify-end">
          <div className="flex-1" onClick={() => setShowNotificationsDrawer(false)}></div>
          <div className="w-full max-w-[380px] bg-slate-900 border-l border-slate-850 h-full p-5 flex flex-col gap-4 shadow-2xl notification-drawer relative z-50">
            <button
              onClick={() => setShowNotificationsDrawer(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white font-black text-lg p-1 w-8 h-8 flex items-center justify-center border border-slate-800 cursor-pointer"
            >
              ✕
            </button>

            <div className="border-b border-slate-800 pb-3 flex items-center justify-between pr-12">
              <div className="flex items-center gap-2">
                <span className="text-xl">🔔</span>
                <h3 className="text-sm font-black uppercase tracking-wider text-white">
                  Recent Activities
                </h3>
              </div>
              {notifications.filter((n) => !n.is_read).length > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-[9px] bg-amber-500 text-slate-950 font-black uppercase px-2 py-1 cursor-pointer hover:bg-amber-600 transition-colors"
                >
                  Mark All Read
                </button>
              )}
            </div>

            {/* Phase 5.6 Drawer Search and Filter tabs */}
            <div className="flex flex-col gap-2">
              <input
                type="text"
                value={notificationSearch}
                onChange={(e) => setNotificationSearch(e.target.value)}
                placeholder="Search ticket, project, title..."
                className="w-full bg-slate-950 border border-slate-800 text-white p-2.5 text-xs outline-none focus:border-amber-500 rounded-sm"
              />
              <div className="flex flex-wrap gap-1 border-b border-slate-800 pb-2">
                {["all", "unread", "complaint", "admin", "system"].map((tab) => {
                  let count = 0;
                  if (tab === "all") count = notifications.length;
                  else if (tab === "unread") count = notifications.filter(n => !n.is_read).length;
                  else if (tab === "complaint") count = notifications.filter(n => ["complaint_created", "complaint_updated"].includes(n.notification_type)).length;
                  else if (tab === "admin") count = notifications.filter(n => ["user_created", "user_disabled"].includes(n.notification_type)).length;
                  else if (tab === "system") count = notifications.filter(n => ["login", "logout"].includes(n.notification_type)).length;

                  return (
                    <button
                      key={tab}
                      onClick={() => setNotificationTab(tab)}
                      className={`px-2 py-1 text-[9px] font-black uppercase transition-all rounded-sm cursor-pointer ${
                        notificationTab === tab
                          ? "bg-amber-500 text-slate-950 border border-amber-600"
                          : "bg-slate-800 text-slate-400 hover:text-white border border-slate-700"
                      }`}
                    >
                      {tab} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-1 notification-drawer-scroll">
              {loadingNotifications ? (
                <div className="p-8 text-center text-slate-500 font-bold uppercase tracking-wider animate-pulse text-xs">
                  ⏳ Loading Activities...
                </div>
              ) : (
                (() => {
                  const filtered = notifications.filter((notif) => {
                    if (notificationTab === "unread" && notif.is_read) return false;
                    if (notificationTab === "complaint" && !["complaint_created", "complaint_updated"].includes(notif.notification_type)) return false;
                    if (notificationTab === "admin" && !["user_created", "user_disabled"].includes(notif.notification_type)) return false;
                    if (notificationTab === "system" && !["login", "logout"].includes(notif.notification_type)) return false;

                    if (notificationSearch.trim()) {
                      const q = notificationSearch.toLowerCase();
                      return (
                        (notif.title || "").toLowerCase().includes(q) ||
                        (notif.description || "").toLowerCase().includes(q) ||
                        (notif.notification_type || "").toLowerCase().includes(q)
                      );
                    }
                    return true;
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="p-8 text-center text-slate-650 font-bold uppercase tracking-wider text-xs">
                        No matching activities found.
                      </div>
                    );
                  }

                  return filtered.map((notif) => (
                    <div
                      key={notif.id}
                      className={`p-4 border text-xs flex flex-col justify-between gap-3 transition-all relative min-h-[145px] ${
                        notif.is_read
                          ? "bg-slate-950/20 border-slate-850 text-slate-400"
                          : "bg-slate-950 border-slate-800 border-l-4 border-l-amber-500 text-slate-200"
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <span className="font-black text-white uppercase text-[10px] tracking-wide flex items-center gap-1">
                          {getNotificationIcon(notif.notification_type)} {notif.title}
                        </span>
                        <span className="font-mono text-[9px] text-slate-500 shrink-0">
                          {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      
                      <p className="font-medium leading-relaxed break-words flex-1 text-slate-350">{notif.description}</p>
                      
                      <div className="flex justify-between items-center mt-1 border-t border-slate-850/60 pt-2">
                        <span className="text-[9px] font-mono uppercase text-slate-500">
                          Type: {notif.notification_type.replace('_', ' ')}
                        </span>
                        {!notif.is_read ? (
                          <button
                            onClick={() => handleMarkAsRead(notif.id)}
                            className="text-[10px] font-black text-amber-500 uppercase hover:underline cursor-pointer"
                          >
                            Acknowledge
                          </button>
                        ) : (
                          <span className="text-[8px] text-slate-650 font-bold select-none">
                            Acknowledged
                          </span>
                        )}
                      </div>
                    </div>
                  ));
                })()
              )}
            </div>

            <div className="border-t border-slate-850 pt-2 text-center text-[9px] font-bold text-slate-500 uppercase tracking-widest">
              Drawer logs up to latest 100 entries
            </div>
          </div>
        </div>
      )}

{/* CREATE NEW USER MODAL (Super Admin Only) */}
      {showCreateUserModal && (
        <div className="fixed inset-0 bg-black/80 z-45 flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-slate-800 w-full max-w-[390px] p-6 shadow-2xl relative animate-fade-in flex flex-col gap-4">
            <button
              onClick={() => setShowCreateUserModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white font-black text-lg p-1 w-8 h-8 flex items-center justify-center border border-slate-800 cursor-pointer"
            >
              ✕
            </button>

            <h3 className="text-sm font-black uppercase text-white tracking-wider border-b border-slate-800 pb-2 pr-12">
              ➕ Create New Administrator
            </h3>

            {createUserError && (
              <div className="bg-red-500/10 border border-red-500/40 text-red-400 text-xs font-semibold p-2 text-center">
                {createUserError}
              </div>
            )}

            <form onSubmit={handleCreateAdminUser} className="flex flex-col gap-3.5 text-xs">
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-black uppercase text-slate-400">Username</label>
                <input
                  type="text"
                  required
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white p-2.5 outline-none focus:border-amber-500"
                  placeholder="e.g. project_lead"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-black uppercase text-slate-400">Email Address</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white p-2.5 outline-none focus:border-amber-500"
                  placeholder="e.g. lead@welfare.com"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-black uppercase text-slate-400">Temporary Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white p-2.5 outline-none focus:border-amber-500"
                  placeholder="••••••••"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-black uppercase text-slate-400">Confirm Password</label>
                <input
                  type="password"
                  required
                  value={newConfirmPassword}
                  onChange={(e) => setNewConfirmPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white p-2.5 outline-none focus:border-amber-500"
                  placeholder="••••••••"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-black uppercase text-slate-400">Security Role</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white p-2.5 outline-none"
                >
                  <option value="Admin">Admin</option>
                  <option value="Super Admin">Super Admin</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-3 mt-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black uppercase tracking-wider border border-slate-950 cursor-pointer shadow-sm active:translate-x-0.5 active:translate-y-0.5"
              >
                Create Account
              </button>
            </form>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL (Super Admin Only) */}
      {showResetPasswordModal && (
        <div className="fixed inset-0 bg-black/80 z-45 flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-slate-800 w-full max-w-[390px] p-6 shadow-2xl relative animate-fade-in flex flex-col gap-4">
            <button
              onClick={() => setShowResetPasswordModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white font-black text-lg p-1 w-8 h-8 flex items-center justify-center border border-slate-800 cursor-pointer"
            >
              ✕
            </button>

            <h3 className="text-sm font-black uppercase text-white tracking-wider border-b border-slate-800 pb-2 pr-12">
              🔒 Reset Admin Password
            </h3>

            <div className="text-xs text-slate-400">
              Resetting password for account: <span className="font-bold text-white font-mono">{resetUsername}</span>
            </div>

            {resetPasswordError && (
              <div className="bg-red-500/10 border border-red-500/40 text-red-400 text-xs font-semibold p-2 text-center">
                {resetPasswordError}
              </div>
            )}

            <form onSubmit={handleResetPassword} className="flex flex-col gap-3.5 text-xs">
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-black uppercase text-slate-400">New Password</label>
                <input
                  type="password"
                  required
                  value={resetNewPassword}
                  onChange={(e) => setResetNewPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white p-2.5 outline-none focus:border-amber-500"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 mt-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black uppercase tracking-wider border border-slate-950 cursor-pointer shadow-sm active:translate-x-0.5 active:translate-y-0.5"
              >
                Reset Password
              </button>
            </form>
          </div>
        </div>
      )}

      {/* PHASE 5.6 ADVANCED EXPANDED OPERATIONS ANALYTICS MODAL */}
      {expandedChart && (
        <div className={`fixed inset-0 bg-black/90 z-50 flex items-center justify-center backdrop-blur-sm ${isFullscreenChart ? "p-0" : "p-4"}`}>
          <div className={`shadow-2xl relative flex flex-col gap-6 overflow-y-auto modal-scroll admin-modal enterprise-card ${
            isFullscreenChart ? "w-screen h-screen p-8 border-none max-h-none rounded-none" : "w-full max-w-[1280px] p-10 max-h-[92vh] rounded-2xl"
          }`}>
            
            <button
              onClick={handleCloseChart}
              className="absolute top-4 right-4 text-slate-400 hover:text-white font-black text-xl hover:bg-slate-800 p-1 w-8 h-8 flex items-center justify-center border border-slate-800 cursor-pointer z-10"
            >
              ✕
            </button>

            <div className="border-b border-slate-800 pb-3 mt-1 flex flex-col md:flex-row md:items-center justify-between gap-4 pr-12">
              <div>
                <span className="text-[10px] font-black uppercase text-amber-500 tracking-widest">
                  Expanded Advanced Operational Analytics
                </span>
                <h2 className="text-xl font-black text-white uppercase tracking-tight">
                  {expandedChart} Distribution Analysis
                </h2>
              </div>

              {/* Exports button toolbar */}
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => {
                    // Export to CSV on client side
                    if (!expandedAnalytics || !expandedAnalytics.drilldown_complaints) return;
                    const list = expandedAnalytics.drilldown_complaints;
                    let csv = "Reference Number,Project,Location,Category,Status,Created At,Language,Worker Selected Language,Detected Language,Transcript Confidence,Translation Confidence,Speech Processing Duration (ms),Translation Language Pair,Translation Verification Result\n";
                    list.forEach(c => {
                      csv += `"${c.reference_number}","${c.project_name}","${c.location_name}","${c.category}","${c.status}","${c.created_at}","${c.language}","${c.worker_selected_language || 'N/A'}","${c.detected_language || 'N/A'}","${c.transcript_confidence !== null && c.transcript_confidence !== undefined ? c.transcript_confidence : 'N/A'}","${c.translation_confidence !== null && c.translation_confidence !== undefined ? c.translation_confidence : 'N/A'}","${c.speech_processing_duration_ms !== null && c.speech_processing_duration_ms !== undefined ? c.speech_processing_duration_ms : 'N/A'}","${c.translation_language_pair || 'N/A'}","${c.translation_verification_result || 'N/A'}"\n`;
                    });
                    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `drilldown_${expandedChart}_export.csv`;
                    a.click();
                  }}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase border border-indigo-700 cursor-pointer rounded-sm"
                >
                  Export CSV
                </button>

                <button
                  onClick={async () => {
                    // Export to Excel via backend endpoint
                    const params = new URLSearchParams();
                    params.append("range_type", expandedRangeType);
                    if (expandedStartDate) params.append("start_date", expandedStartDate);
                    if (expandedEndDate) params.append("end_date", expandedEndDate);
                    
                    const url = `http://localhost:8000/api/dashboard/export/?${params.toString()}`;
                    const res = await fetch(url, { credentials: "include" });
                    if (res.ok) {
                      const blob = await res.blob();
                      const dlUrl = window.URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = dlUrl;
                      a.download = "complaints_export.xlsx";
                      a.click();
                    } else {
                      alert("Excel export failed.");
                    }
                  }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase border border-emerald-700 cursor-pointer rounded-sm"
                >
                  Export Excel
                </button>

                <button
                  onClick={() => {
                    // Export SVG chart to PNG on client side
                    const svgEl = document.getElementById("expanded-svg-chart");
                    if (!svgEl) return;
                    const svgString = new XMLSerializer().serializeToString(svgEl);
                    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
                    const URL = window.URL || window.webkitURL || window;
                    const blobURL = URL.createObjectURL(svgBlob);
                    
                    const image = new Image();
                    image.onload = () => {
                      const canvas = document.createElement("canvas");
                      canvas.width = svgEl.clientWidth * 2 || 1200;
                      canvas.height = svgEl.clientHeight * 2 || 600;
                      const context = canvas.getContext("2d");
                      context.fillStyle = theme === "dark" ? "#0f172a" : "#ffffff";
                      context.fillRect(0, 0, canvas.width, canvas.height);
                      context.drawImage(image, 0, 0, canvas.width, canvas.height);
                      
                      const png = canvas.toDataURL("image/png");
                      const a = document.createElement("a");
                      a.href = png;
                      a.download = `analytics_${expandedChart}_chart.png`;
                      a.click();
                    };
                    image.src = blobURL;
                  }}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-[10px] font-black uppercase border border-amber-650 cursor-pointer rounded-sm"
                >
                  Export PNG
                </button>

                <button
                  onClick={() => setIsFullscreenChart(!isFullscreenChart)}
                  className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-[10px] font-black uppercase border border-sky-700 cursor-pointer rounded-sm"
                >
                  {isFullscreenChart ? "Exit Fullscreen" : "Fullscreen"}
                </button>
              </div>
            </div>

            {/* Date range controls */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-950 p-4 border border-slate-850 rounded-sm text-xs items-end">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase text-slate-500">Period Filter</label>
                <select
                  value={expandedRangeType}
                  onChange={(e) => {
                    setExpandedRangeType(e.target.value);
                    if (e.target.value !== "custom") {
                      fetchExpandedAnalytics(expandedChart, e.target.value, "", "");
                    }
                  }}
                  className="w-full bg-slate-900 border border-slate-800 text-white p-2 outline-none"
                >
                  <option value="today">Today</option>
                  <option value="7days">Last 7 Days</option>
                  <option value="30days">Last 30 Days</option>
                  <option value="custom">Custom Date Range</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase text-slate-500">Start Date</label>
                <input
                  type="date"
                  disabled={expandedRangeType !== "custom"}
                  value={expandedStartDate}
                  onChange={(e) => setExpandedStartDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 text-white p-2 outline-none disabled:opacity-50"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase text-slate-500">End Date</label>
                <input
                  type="date"
                  disabled={expandedRangeType !== "custom"}
                  value={expandedEndDate}
                  onChange={(e) => setExpandedEndDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 text-white p-2 outline-none disabled:opacity-50"
                />
              </div>

              <button
                disabled={expandedRangeType !== "custom"}
                onClick={() => fetchExpandedAnalytics(expandedChart, "custom", expandedStartDate, expandedEndDate)}
                className="w-full py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-800 text-slate-950 font-black uppercase border border-slate-950 cursor-pointer disabled:cursor-not-allowed"
              >
                Apply Range
              </button>
            </div>

            {/* Display Area: Chart on top, data details side, complaints table on bottom */}
            {loadingExpandedAnalytics ? (
              <div className="h-[280px] flex items-center justify-center text-slate-400 font-bold uppercase tracking-wider animate-pulse bg-slate-950 border border-slate-850">
                ⏳ Loading operational dataset...
              </div>
            ) : !expandedAnalytics ? (
              <div className="h-[280px] flex items-center justify-center text-slate-650 font-bold uppercase tracking-wider bg-slate-950 border border-slate-850">
                No dataset loaded
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                
                {/* Visual rendering row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  {/* Expanded SVG Chart */}
                  <div className={`chart-expanded-panel enterprise-card p-8 col-span-2 flex items-center justify-center transition-all duration-300 ${isFullscreenChart ? "h-[90vh] min-h-[90vh]" : "min-h-[520px]"}`}>
                    {expandedChart === "category" && (
                      <svg id="expanded-svg-chart" viewBox="0 0 500 240" className="w-full h-full">
                        <line x1="30" y1="20" x2="480" y2="20" stroke="#334155" strokeWidth="1" strokeDasharray="3" />
                        <line x1="30" y1="100" x2="480" y2="100" stroke="#334155" strokeWidth="1" strokeDasharray="3" />
                        <line x1="30" y1="180" x2="480" y2="180" stroke="#334155" strokeWidth="1" strokeDasharray="3" />
                        <line x1="30" y1="180" x2="480" y2="180" stroke="#475569" strokeWidth="2" />
                        {(() => {
                          const list = expandedAnalytics.category_distribution || [];
                          const maxCount = Math.max(...list.map(item => item.count), 1);
                          const barWidth = Math.min(35, 360 / list.length);
                          const gap = (430 - (barWidth * list.length)) / (list.length + 1);

                          return list.map((item, index) => {
                            const barHeight = (item.count / maxCount) * 150;
                            const x = 30 + gap + index * (barWidth + gap);
                            const y = 180 - barHeight;
                            const isFiltered = chartFilterCategory === item.category;

                            return (
                              <g 
                                key={item.category} 
                                className="group cursor-pointer hover:scale-[1.03] origin-bottom transition-transform"
                                onClick={() => handleChartClick("category", item.category)}
                                onMouseMove={(e) => handleChartMouseMove(e, `Category: ${item.category}`, item)}
                                onMouseLeave={handleChartMouseLeave}
                              >
                                <rect
                                  x={x}
                                  y={y}
                                  width={barWidth}
                                  height={barHeight}
                                  fill={isFiltered ? "#ea580c" : "#f59e0b"}
                                  className="transition-all hover:fill-amber-400"
                                />
                                <text x={x + barWidth / 2} y={y - 5} textAnchor="middle" fill="#cbd5e1" fontSize="14" fontWeight="bold">{item.count}</text>
                                <text
                                  x={x + barWidth / 2}
                                  y="202"
                                  textAnchor="end"
                                  fill={isFiltered ? "#f97316" : "#94a3b8"}
                                  fontSize="14"
                                  fontWeight="bold"
                                  className="uppercase font-mono"
                                  transform={`rotate(-45, ${x + barWidth / 2}, 202)`}
                                >
                                  {item.category}
                                </text>
                              </g>
                            );
                          });
                        })()}
                      </svg>
                    )}

                    {expandedChart === "status" && (
                      <div className="donut-expanded-layout w-full h-full flex flex-col lg:flex-row items-center justify-center gap-10 py-4">
                        <DonutChart
                          data={expandedAnalytics.status_distribution || []}
                          size="large"
                          filterStatus={chartFilterStatus}
                          onSliceClick={(status) => handleChartClick("status", status)}
                          onSliceMouseMove={handleChartMouseMove}
                          onSliceMouseLeave={handleChartMouseLeave}
                        />
                        <DonutLegend
                          data={expandedAnalytics.status_distribution || []}
                          filterStatus={chartFilterStatus}
                          onItemClick={(status) => handleChartClick("status", status)}
                        />
                      </div>
                    )}

                    {expandedChart === "project" && (
                      <svg id="expanded-svg-chart" viewBox="0 0 500 240" className="w-full h-full">
                        <line x1="100" y1="220" x2="480" y2="220" stroke="#334155" strokeWidth="1" />
                        <line x1="290" y1="10" x2="290" y2="220" stroke="#334155" strokeWidth="1" strokeDasharray="3" />
                        <line x1="480" y1="10" x2="480" y2="220" stroke="#334155" strokeWidth="1" strokeDasharray="3" />
                        {(() => {
                          const list = expandedAnalytics.project_distribution || [];
                          const maxCount = Math.max(...list.map(item => item.count), 1);
                          const barHeight = 22;
                          const gap = (200 - (barHeight * list.length)) / (list.length + 1);

                          return list.map((item, index) => {
                            const barWidth = (item.count / maxCount) * 360;
                            const y = 10 + gap + index * (barHeight + gap);
                            const isFiltered = chartFilterProject === item.project;

                            return (
                              <g 
                                key={item.project} 
                                className="group cursor-pointer hover:scale-[1.01] origin-left transition-transform"
                                onClick={() => handleChartClick("project", item.project)}
                                onMouseMove={(e) => handleChartMouseMove(e, `Project: ${item.project}`, item)}
                                onMouseLeave={handleChartMouseLeave}
                              >
                                <text x="90" y={y + 14} textAnchor="end" fill={isFiltered ? "#F97316" : "#CBD5E1"} fontSize="16" fontWeight="600">
                                  {item.project.length > 32 ? item.project.substring(0, 30) + "…" : item.project}
                                </text>
                                <rect
                                  x="100"
                                  y={y}
                                  width={barWidth}
                                  height={barHeight}
                                  fill={isFiltered ? "#ea580c" : "#6366f1"}
                                  className="transition-all hover:fill-indigo-400"
                                />
                                <text x={100 + barWidth + 8} y={y + 14} fill="#cbd5e1" fontSize="16" fontWeight="bold">{item.count}</text>
                              </g>
                            );
                          });
                        })()}
                      </svg>
                    )}

                    {expandedChart === "trend" && (
                      <svg id="expanded-svg-chart" viewBox="0 0 500 240" className="w-full h-full">
                        <line x1="30" y1="20" x2="480" y2="20" stroke="#334155" strokeWidth="1" strokeDasharray="3" />
                        <line x1="30" y1="100" x2="480" y2="100" stroke="#334155" strokeWidth="1" strokeDasharray="3" />
                        <line x1="30" y1="180" x2="480" y2="180" stroke="#334155" strokeWidth="1" strokeDasharray="3" />
                        <line x1="30" y1="180" x2="480" y2="180" stroke="#475569" strokeWidth="2" />
                        {(() => {
                          const list = expandedAnalytics.monthly_trend || [];
                          const maxCount = Math.max(...list.map(item => item.count), 1);
                          const countPoints = list.length;
                          const plotWidth = 430;
                          const coords = list.map((item, index) => {
                            const x = 30 + (countPoints > 1 ? index * (plotWidth / (countPoints - 1)) : plotWidth / 2);
                            const y = 180 - (item.count / maxCount) * 150;
                            return { x, y, count: item.count, label: item.month, data: item };
                          });

                          const linePath = coords.map((pt, i) => `${i === 0 ? "M" : "L"} ${pt.x} ${pt.y}`).join(" ");
                          return (
                            <>
                              {linePath && <path d={linePath} fill="none" stroke="#06b6d4" strokeWidth="3" />}
                              {coords.map((pt) => {
                                const isFiltered = chartFilterMonth === pt.label;
                                return (
                                  <g 
                                    key={pt.label} 
                                    className="group cursor-pointer hover:scale-[1.1] origin-center transition-transform"
                                    onClick={() => handleChartClick("month", pt.label)}
                                    onMouseMove={(e) => handleChartMouseMove(e, `Month: ${pt.label}`, pt.data)}
                                    onMouseLeave={handleChartMouseLeave}
                                  >
                                    <circle cx={pt.x} cy={pt.y} r={isFiltered ? "7" : "5"} fill={isFiltered ? "#ea580c" : "#06b6d4"} className="hover:r-7 transition-all" />
                                    <text x={pt.x} y={pt.y - 10} textAnchor="middle" fill="#cbd5e1" fontSize="16" fontWeight="bold">{pt.count}</text>
                                    <text x={pt.x} y="198" textAnchor="middle" fill={isFiltered ? "#f97316" : "#94a3b8"} fontSize="14" fontWeight="bold" className="uppercase font-mono">{pt.label}</text>
                                  </g>
                                );
                              })}
                            </>
                          );
                        })()}
                      </svg>
                    )}

                    {expandedChart === "location" && (
                      <svg id="expanded-svg-chart" viewBox="0 0 500 240" className="w-full h-full">
                        <line x1="30" y1="20" x2="480" y2="20" stroke="#334155" strokeWidth="1" strokeDasharray="3" />
                        <line x1="30" y1="100" x2="480" y2="100" stroke="#334155" strokeWidth="1" strokeDasharray="3" />
                        <line x1="30" y1="180" x2="480" y2="180" stroke="#334155" strokeWidth="1" strokeDasharray="3" />
                        <line x1="30" y1="180" x2="480" y2="180" stroke="#475569" strokeWidth="2" />
                        {(() => {
                          const list = (expandedAnalytics.location_distribution || []).slice(0, 7);
                          const maxCount = Math.max(...list.map(item => item.count), 1);
                          const barWidth = Math.min(40, 360 / list.length);
                          const gap = (430 - (barWidth * list.length)) / (list.length + 1);

                          return list.map((item, index) => {
                            const barHeight = (item.count / maxCount) * 150;
                            const x = 30 + gap + index * (barWidth + gap);
                            const y = 180 - barHeight;
                            const isFiltered = chartFilterLocation === item.location;

                            return (
                              <g 
                                key={item.location} 
                                className="group cursor-pointer hover:scale-[1.03] origin-bottom transition-transform"
                                onClick={() => handleChartClick("location", item.location)}
                                onMouseMove={(e) => handleChartMouseMove(e, `Location: ${item.location}`, item)}
                                onMouseLeave={handleChartMouseLeave}
                              >
                                <rect
                                  x={x}
                                  y={y}
                                  width={barWidth}
                                  height={barHeight}
                                  fill={isFiltered ? "#ea580c" : "#10b981"}
                                  className="transition-all hover:fill-emerald-400"
                                />
                                <text x={x + barWidth / 2} y={y - 5} textAnchor="middle" fill="#cbd5e1" fontSize="14" fontWeight="bold">{item.count}</text>
                                <text
                                  x={x + barWidth / 2}
                                  y="202"
                                  textAnchor="end"
                                  fill={isFiltered ? "#f97316" : "#94a3b8"}
                                  fontSize="14"
                                  fontWeight="bold"
                                  className="uppercase font-mono"
                                  transform={`rotate(-45, ${x + barWidth / 2}, 202)`}
                                >
                                  {item.location.length > 12 ? item.location.substring(0, 10) + ".." : item.location}
                                </text>
                              </g>
                            );
                          });
                        })()}
                      </svg>
                    )}
                  </div>

                  {/* Summary counts detail */}
                  <div className="bg-slate-950 border border-slate-850 p-4 flex flex-col gap-3 text-xs">
                    <span className="font-black uppercase text-slate-500 text-[10px]">Segment Statistics & Details</span>
                    
                    <div className="flex flex-col gap-2 overflow-y-auto max-h-[250px] pr-1">
                      {expandedChart === "category" && expandedAnalytics.category_distribution?.map((item) => (
                        <div key={item.category} className="flex items-center justify-between border-b border-slate-900 pb-1.5 font-semibold text-slate-300">
                          <span className="uppercase">{item.category}:</span>
                          <span className="font-bold text-white">{item.count} ({item.percentage}%)</span>
                        </div>
                      ))}

                      {expandedChart === "status" && expandedAnalytics.status_distribution?.map((item) => (
                        <div key={item.status} className="flex items-center justify-between border-b border-slate-900 pb-1.5 font-semibold text-slate-300">
                          <span className="uppercase">{item.status}:</span>
                          <span className="font-bold text-white">{item.count} ({item.percentage}%)</span>
                        </div>
                      ))}

                      {expandedChart === "project" && expandedAnalytics.project_distribution?.map((item) => (
                        <div key={item.project} className="flex items-center justify-between border-b border-slate-900 pb-1.5 font-semibold text-slate-300">
                          <span className="uppercase">{item.project}:</span>
                          <span className="font-bold text-white">{item.count} ({item.percentage}%)</span>
                        </div>
                      ))}

                      {expandedChart === "trend" && expandedAnalytics.monthly_trend?.map((item) => (
                        <div key={item.month} className="flex items-center justify-between border-b border-slate-900 pb-1.5 font-semibold text-slate-300">
                          <span className="uppercase">{item.month}:</span>
                          <span className="font-bold text-white">{item.count} ({item.percentage}%)</span>
                        </div>
                      ))}

                      {expandedChart === "location" && expandedAnalytics.location_distribution?.map((item) => (
                        <div key={item.location} className="flex items-center justify-between border-b border-slate-900 pb-1.5 font-semibold text-slate-300">
                          <span className="uppercase">{item.location}:</span>
                          <span className="font-bold text-white">{item.count} ({item.percentage}%)</span>
                        </div>
                      ))}
                    </div>

                    {/* Summary metrics display block */}
                    {expandedAnalytics.summary_stats && (
                      <div className="bg-slate-900/50 p-3 border border-slate-900 rounded-sm mt-auto flex flex-col gap-1.5">
                        <div className="flex justify-between font-bold text-slate-400">
                          <span>Operational Total:</span>
                          <span className="text-white">{expandedAnalytics.summary_stats.total_complaints}</span>
                        </div>
                        <div className="flex justify-between font-bold text-emerald-400">
                          <span>Resolution Rate:</span>
                          <span>{expandedAnalytics.summary_stats.resolution_rate}%</span>
                        </div>
                        <div className="flex justify-between font-bold text-amber-400">
                          <span>Pending Rate:</span>
                          <span>{expandedAnalytics.summary_stats.pending_rate}%</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Drill-down complaints table */}
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-black uppercase text-slate-500">Drill-Down Registered Tickets ({expandedAnalytics.drilldown_complaints?.length || 0} tickets)</span>
                  
                  <div className="overflow-x-auto max-h-52 border border-slate-850 bg-slate-950 text-xs">
                    {(!expandedAnalytics.drilldown_complaints || expandedAnalytics.drilldown_complaints.length === 0) ? (
                      <div className="p-6 text-center text-slate-500 font-bold uppercase">No records registered for this range</div>
                    ) : (
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 font-extrabold uppercase select-none">
                            <th className="p-2.5">Reference #</th>
                            <th className="p-2.5">Project</th>
                            <th className="p-2.5">Location</th>
                            <th className="p-2.5">Category</th>
                            <th className="p-2.5">Created Date</th>
                            <th className="p-2.5">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {expandedAnalytics.drilldown_complaints.map((c) => {
                            const isActive = c.id === activeDrilldownRowId;
                            return (
                              <tr
                                key={c.id}
                                className={`border-b border-slate-900 hover:bg-slate-900/40 text-slate-300 font-bold transition-colors ${
                                  isActive ? "bg-slate-800/80 text-white border-l-2 border-l-cyan-450" : ""
                                }`}
                              >
                                <td className="p-2">
                                  <button
                                    onClick={() => {
                                      setSelectedComplaint(c);
                                      setActiveDrilldownRowId(c.id);
                                    }}
                                    className="text-cyan-400 hover:underline font-black font-mono text-[11px]"
                                  >
                                    {c.reference_number}
                                  </button>
                                </td>
                                <td className="p-2 truncate max-w-[150px]">{c.project_name}</td>
                                <td className="p-2 truncate max-w-[150px]">{c.location_name}</td>
                                <td className="p-2 text-amber-500 uppercase font-mono">{c.category}</td>
                                <td className="p-2 font-semibold text-slate-450">{new Date(c.created_at).toLocaleDateString()}</td>
                                <td className="p-2">
                                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-sm ${getBadgeStyle(c.status)}`}>
                                    {c.status}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

              </div>
            )}
            
          </div>
        </div>
      )}

      {/* Warning Hazard Stripes Footer */}
      <footer className="mt-auto h-3 bg-slate-900 border-t border-slate-800 flex items-center justify-center z-10">
        <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
          Secured Admin Channel
        </div>
      </footer>

    </div>
  );
}
