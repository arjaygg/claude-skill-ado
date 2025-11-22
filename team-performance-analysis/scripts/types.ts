/**
 * Type definitions for team performance analysis
 */

// Team Member
export interface TeamMember {
  displayName: string;
  adoIdentity: string;
  email: string;
  status: string;
  role: string;
}

// Analysis Configuration
export interface AnalysisConfig {
  dataDir: string;
  outputDir: string;
  dateRangeStart: string;
  dateRangeEnd: string;
  metrics: string[];
  ageThresholdDays: number;
  highVarianceThresholdPct: number;
}

// Azure DevOps Work Item (simplified)
export interface WorkItem {
  id: number;
  rev: number;
  fields: {
    'System.WorkItemType'?: string;
    'System.Title'?: string;
    'System.State'?: string;
    'System.AssignedTo'?: AssignedTo | string;
    'System.CreatedDate'?: string;
    'System.ChangedDate'?: string;
    'System.ClosedDate'?: string;
    'Microsoft.VSTS.Common.ClosedDate'?: string;
    'System.IterationPath'?: string;
    'System.AreaPath'?: string;
    'System.Reason'?: string;
    'Microsoft.VSTS.Common.StateChangeDate'?: string;
    'Microsoft.VSTS.Scheduling.OriginalEstimate'?: number;
    'Microsoft.VSTS.Scheduling.CompletedWork'?: number;
    'Microsoft.VSTS.Scheduling.RemainingWork'?: number;
    [key: string]: any;
  };
}

export interface AssignedTo {
  displayName: string;
  uniqueName: string;
  id: string;
  imageUrl?: string;
}

// Cycle Time Results
export interface CycleTimeResult {
  byMember: Record<string, MemberCycleTime>;
  byMonth: Record<string, MonthCycleTime>;
  byType: Record<string, TypeCycleTime>;
}

export interface MemberCycleTime {
  avg: number;
  median: number;
  count: number;
  min?: number;
  max?: number;
}

export interface MonthCycleTime {
  avg: number;
  median: number;
  count: number;
}

export interface TypeCycleTime {
  avg: number;
  median: number;
  count: number;
}

// Estimation Accuracy Results
export interface EstimationAccuracyResult {
  byMember: Record<string, MemberEstimation>;
  byMonth: Record<string, MonthEstimation>;
}

export interface MemberEstimation {
  totalEstimate: number;
  totalActual: number;
  variancePct: number;
  itemCount: number;
  avgVariance?: number;
  medianVariance?: number;
  highVarianceItems?: number;
}

export interface MonthEstimation {
  totalEstimate: number;
  totalActual: number;
  variancePct: number;
  itemCount: number;
}

// Work Item Age Results
export interface WorkItemAgeResult {
  byMember: Record<string, MemberAge>;
}

export interface MemberAge {
  count: number;
  avgAgeDays: number;
  maxAgeDays: number;
  itemsOverThreshold?: number;
}

// Work Patterns Results
export interface WorkPatternsResult {
  creationVsCompletion: Record<string, MonthPattern>;
  sizeDistribution: Record<string, number>;
}

export interface MonthPattern {
  created: number;
  completed: number;
  delta?: number;
}

// State Distribution Results
export interface StateDistributionResult {
  byMonth: Record<string, Record<string, number>>;
  byMember: Record<string, Record<string, number>>;
}

// Reopened Items Results
export interface ReopenedItemsResult {
  reworkCount: number;
  reworkRatePct: number;
  items: ReworkItem[];
}

export interface ReworkItem {
  id: number;
  state: string;
  reason: string;
  assignedTo: string;
}

// Deep Metrics - Time in State
export interface TimeInStateResult {
  byMember: Record<string, MemberTimeInState>;
  byWorkItem: WorkItemStateBreakdown[];
  overall: OverallStateTime;
}

export interface MemberTimeInState {
  avgTimeInStates: Record<string, number>;
  totalItems: number;
  bottleneckState: string;
  bottleneckAvgDays: number;
}

export interface WorkItemStateBreakdown {
  id: number;
  title: string;
  assignedTo: string;
  totalCycleTime: number;
  stateBreakdown: Record<string, number>;
  longestState: string;
  longestStateDays: number;
}

export interface OverallStateTime {
  avgTimeByState: Record<string, number>;
  itemsAnalyzed: number;
  commonBottleneck: string;
}

// Deep Metrics - Daily WIP
export interface DailyWipResult {
  byMember: Record<string, MemberWipStats>;
  byDate: Record<string, DateWipSnapshot>;
  overallStats: OverallWipStats;
}

export interface MemberWipStats {
  avgWip: number;
  maxWip: number;
  maxWipDate: string;
  daysOver3: number;
  daysOver5: number;
  totalDaysTracked: number;
  wipDistribution: Record<number, number>;
}

export interface DateWipSnapshot {
  date: string;
  memberWip: Record<string, number>;
  totalWip: number;
}

export interface OverallWipStats {
  avgWipAcrossTeam: number;
  peakWipDate: string;
  peakWipCount: number;
  highConcurrencyDays: number;
}

// Deep Metrics - Flow Efficiency
export interface FlowEfficiencyResult {
  byMember: Record<string, MemberFlowEfficiency>;
  byWorkItem: WorkItemFlowEfficiency[];
  overall: OverallFlowEfficiency;
}

export interface MemberFlowEfficiency {
  avgEfficiencyPct: number;
  avgActiveTime: number;
  avgWaitTime: number;
  avgTotalTime: number;
  itemsAnalyzed: number;
  efficiencyRating: 'Excellent' | 'Good' | 'Fair' | 'Poor';
}

export interface WorkItemFlowEfficiency {
  id: number;
  title: string;
  assignedTo: string;
  activeTime: number;
  waitTime: number;
  totalTime: number;
  efficiencyPct: number;
}

export interface OverallFlowEfficiency {
  avgEfficiencyPct: number;
  excellentCount: number;
  goodCount: number;
  fairCount: number;
  poorCount: number;
}

// Deep Metrics - Sprint Analysis
export interface SprintAnalysisResult {
  bySprint: Record<string, SprintMetrics>;
  byMember: Record<string, MemberSprintMetrics>;
  overall: OverallSprintMetrics;
}

export interface SprintMetrics {
  sprintName: string;
  startDate: string | null;
  endDate: string | null;
  totalItems: number;
  completedItems: number;
  completionRate: number;
  unplannedItems: number;
  unplannedRatio: number;
  carryoverItems: number;
  velocity: number;
}

export interface MemberSprintMetrics {
  totalSprints: number;
  avgItemsPerSprint: number;
  avgCompletionRate: number;
  avgUnplannedRatio: number;
  bestSprint: string;
  worstSprint: string;
}

export interface OverallSprintMetrics {
  totalSprints: number;
  avgVelocity: number;
  avgCompletionRate: number;
  avgUnplannedRatio: number;
  velocityTrend: 'increasing' | 'stable' | 'decreasing';
}

// Work Item Update (for history-based analysis)
export interface WorkItemUpdate {
  workItemId: number;
  rev: number;
  revisedDate: string;
  revisedBy?: any;
  fields?: {
    'System.State'?: {
      oldValue?: string;
      newValue?: string;
    };
    'System.AssignedTo'?: {
      oldValue?: string | any;
      newValue?: string | any;
    };
    'System.IterationPath'?: {
      oldValue?: string;
      newValue?: string;
    };
    [key: string]: any;
  };
}

// Complete Analysis Result
export interface AnalysisResult {
  metadata: {
    analyzedAt: string;
    dataSource: string;
    teamMembersCount: number;
    workItemsCount: number;
    dateRange: {
      start: string;
      end: string;
    };
    historyDataAvailable?: boolean;
  };
  cycleTime?: CycleTimeResult;
  estimationAccuracy?: EstimationAccuracyResult;
  workItemAge?: WorkItemAgeResult;
  workPatterns?: WorkPatternsResult;
  stateDistribution?: StateDistributionResult;
  reopenedItems?: ReopenedItemsResult;
  // Deep metrics (require history data)
  timeInState?: TimeInStateResult;
  dailyWip?: DailyWipResult;
  flowEfficiency?: FlowEfficiencyResult;
  sprintAnalysis?: SprintAnalysisResult;
}

// Analysis Options
export interface AnalysisOptions {
  teamMembersFile: string;
  configFile: string;
  workItemsFile: string;
  historyFile?: string; // Optional: for deep metrics
  metrics?: string[] | 'all';
  outputFormat?: 'json' | 'toon' | 'both';
}
