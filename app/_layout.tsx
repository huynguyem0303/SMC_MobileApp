import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { useColorScheme } from '@/hooks/useColorScheme';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
        <Stack.Screen name="Authen/LoginScreen" options={{ headerShown: false }} />
        <Stack.Screen name="Authen/LoginStaffScreen" options={{ headerShown: false }} />
        <Stack.Screen name="MenuScreen" options={{ headerShown: false }} />
        <Stack.Screen name="StaffMenuScreen" options={{ headerShown: false }} />
        <Stack.Screen name="MentorLecturerMenuScreen" options={{ headerShown: false }} />
        <Stack.Screen name="RequestListScreen" options={{ headerShown: false }} />
        <Stack.Screen name="MyTeamScreen" options={{ headerShown: false }} />
        <Stack.Screen name="TimeLineScreen" options={{ headerShown: false }} />
        <Stack.Screen name="Events/EvenListScreen" options={{ headerShown: false }} />
        <Stack.Screen name="Events/QrScanScreen" options={{ headerShown: false }} />
        <Stack.Screen name="Events/EventDetailScreen" options={{ headerShown: false }} />
        <Stack.Screen name="Projects/ProjectDetailScreen" options={{ headerShown: false }} />
        <Stack.Screen name="Projects/MyProjectScreen" options={{ headerShown: false }} />
        <Stack.Screen name="Projects/ProjectListScreen" options={{ headerShown: false }} />
        <Stack.Screen name="Projects/MentorLecturerProjectListScreen" options={{ headerShown: false }} />
        <Stack.Screen name="Projects/MentorLecturerProjectDetailScreen" options={{ headerShown: false }} />
        <Stack.Screen name="Projects/FinanceScreen" options={{ headerShown: false }} />
        <Stack.Screen name="Appointments/CalendarScreen" options={{ headerShown: false }} />
        <Stack.Screen name="Appointments/MentorLecturerCalendarScreen" options={{ headerShown: false }} />
        <Stack.Screen name="Tasks/MilestoneScreen" options={{ headerShown: false }} />
        <Stack.Screen name="Tasks/TaskListScreen" options={{ headerShown: false }} />
        <Stack.Screen name="Tasks/MentorLecturerProjectTaskListScreen" options={{ headerShown: false }} />
        <Stack.Screen name="Tasks/TaskDetailScreen" options={{ headerShown: false }} />
      </Stack>
    </ThemeProvider>
  );
}
