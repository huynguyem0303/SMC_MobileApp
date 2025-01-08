/* eslint-disable */
import * as Router from 'expo-router';

export * from 'expo-router';

declare module 'expo-router' {
  export namespace ExpoRouter {
    export interface __routes<T extends string = string> extends Record<string, unknown> {
      StaticRoutes: `/` | `/(tabs)` | `/(tabs)/` | `/(tabs)/explore` | `/Appointments/CalendarScreen` | `/Appointments/MentorLecturerCalendarScreen` | `/Authen/LoginScreen` | `/Authen/LoginStaffScreen` | `/Events/EvenListScreen` | `/Events/EventDetailScreen` | `/Events/Overlay` | `/Events/QrScanScreen` | `/MentorLecturerMenuScreen` | `/MenuScreen` | `/MyTeamScreen` | `/Projects/FinanceScreen` | `/Projects/MentorLecturerProjectDetailScreen` | `/Projects/MentorLecturerProjectListScreen` | `/Projects/MyProjectScreen` | `/Projects/ProjectDetailScreen` | `/Projects/ProjectListScreen` | `/RequestListScreen` | `/StaffMenuScreen` | `/Tasks/MentorLecturerProjectTaskListScreen` | `/Tasks/MilestoneScreen` | `/Tasks/TaskDetailScreen` | `/Tasks/TaskListScreen` | `/TimeLineScreen` | `/_sitemap` | `/explore`;
      DynamicRoutes: never;
      DynamicRouteTemplate: never;
    }
  }
}
