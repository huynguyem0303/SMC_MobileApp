import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView, Image, TextInput, Alert, Modal } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import getToken from '../../components/Jwt/getToken';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { checkToken } from '../../components/checkToken'; 
import { showSessionExpiredAlert } from '../../components/alertUtils';
type MentorLecturer = {
  name: string;
  roleType: 'Mentor' | 'Lecturer';
};

type TeamMember = {
  studentName: string;
  studentCode: string;
  memberRole: string;
  isLeader: boolean;
  isDeleted: boolean;
};

type ProjectDetail = {
  projectName: string;
  projectDetail: string;
  coverImage: string | null;
  mentorsAndLecturers: MentorLecturer[];
  memberWanted: string;
  team: {
    teamId: string;
    members: TeamMember[];
  };
};

const ProjectDetailScreen = () => {
  const [projectDetail, setProjectDetail] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userToken, setUserToken] = useState<string | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [reason, setReason] = useState<string>('');
  const router = useRouter();
  const { projectId } = useLocalSearchParams();

  const fetchProjectDetail = async () => {
    try {
      const token = await checkToken();
      if (token === null) {
        showSessionExpiredAlert(router);
        return;
    }
      const response = await fetch(`https://smnc.site/api/Projects/${projectId}`, {
        method: 'GET',
        headers: {
          'accept': 'text/plain',
          'Authorization': `Bearer ${token}`, // Make sure 'token' is defined and holds the authorization token
        },
      });
      const data = await response.json();
      if (data.status) {
        setProjectDetail(data.data);
      } else {
        setError(data.message);
      }
      setLoading(false);
    } catch (error) {
      // console.log('Error fetching project detail:', error);
      setError('Failed to fetch project details.');
      setLoading(false);
    }
  };

  const retrieveToken = async () => {
    try {
      const token = await checkToken();
      if (token === null) {
        showSessionExpiredAlert(router);
      } else {
        setUserToken(token);
      }
    } catch (error) {
      // console.log('Error retrieving token: ', error);
      Alert.alert('Error', 'An error occurred while retrieving the token.');
    }
  };

  useEffect(() => {
    const initialize = async () => {
      await retrieveToken();
      fetchProjectDetail(); // Fetch project details if token retrieval is successful
    };

    initialize();
  }, [router]);


  const handleJoinTeam = async () => {
    if (!projectDetail || !userToken) return;

    // Ensure the reason is not empty
    if (reason.trim() === '') {
        Alert.alert('Input Required', 'Please enter your reason for joining the team.');
        return;
    }

    // Validate the length (not exceeding 200 words)
    const wordCount = reason.trim().split(/\s+/).length;
    if (wordCount > 200) {
        Alert.alert('Input Too Long', 'Your reason for joining the team should not exceed 200 words.');
        return;
    }
    // Validate that the reason doesn't contain any special characters
    const specialCharPattern = /[^a-zA-Z0-9\s]/;
    if (specialCharPattern.test(reason)) {
        Alert.alert('Invalid Characters', 'Your reason should not contain any special characters.');
        return;
    }
    const value = await AsyncStorage.getItem('@haveTeam');
    if (value !== null) { // Value was found, parse it as needed 
        const haveTeam = JSON.parse(value);
        if (haveTeam) {
            Alert.alert('Error', 'You already have a team.');
            return;
        }
    }
    const requestBody = {
      type: 0,
      teamId: projectDetail.team.teamId,
      receiverId: null,
      Comment: reason, // The text of the input
    };

    try {
      const response = await fetch('https://smnc.site/api/TeamRequest', {
        method: 'POST',
        headers: {
          Accept: '*/*',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();
      if (result.status) {
        Alert.alert('Success', 'Request to join team sent successfully!');
        setShowModal(false);
        setReason(''); // Reset the input
      } else {
        const errorMessage = result.errors ? result.errors.join(', ') : result.message || 'Failed to send request.';
        Alert.alert('Error', errorMessage);
      }
    } catch (error) {
      // console.log('Error sending request to join team:', error);
      Alert.alert('Error', 'Failed to send request.');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.loadingText}>Loading project details...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={router.back} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!projectDetail) {
    return (
      <View style={styles.noProjectContainer}>
        <Text style={styles.noProjectText}>Project details not found</Text>
        <TouchableOpacity onPress={router.back} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { projectName, projectDetail: detail, coverImage, mentorsAndLecturers, memberWanted, team } = projectDetail;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={router.back} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerText}>Project Detail</Text>
      </View>
      {coverImage && (
        <Image source={{ uri: coverImage }} style={styles.coverImage} />
      )}
      <View style={styles.projectDetailContainer}>
        <Text style={styles.projectTitle}>{projectName}</Text>
        <Text style={styles.projectDescription}>{detail}</Text>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mentors:</Text>
          {mentorsAndLecturers.filter(m => m.roleType === 'Mentor').map((mentor, index) => (
            <Text key={index} style={styles.personName}>{mentor.name}</Text>
          ))}
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lecturers:</Text>
          {mentorsAndLecturers.filter(m => m.roleType === 'Lecturer').map((lecturer, index) => (
            <Text key={index} style={styles.personName}>{lecturer.name}</Text>
          ))}
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Team Members:</Text>
          {team.members
            .filter(member => !member.isDeleted)
            .sort((a, b) => (b.isLeader ? 1 : -1) - (a.isLeader ? 1 : -1))
            .map((member, index) => (
              <Text key={index} style={styles.personName}>
                {member.studentName} - {member.studentCode} - {member.memberRole} {member.isLeader ? '(Leader)' : ''}
              </Text>
            ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Member Wanted:</Text>
          <Text style={styles.personName}>{memberWanted}</Text>
        </View>
        <TouchableOpacity style={styles.joinButton} onPress={() => setShowModal(true)}>
          <Text style={styles.joinButtonText}>Request to Join Team</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={showModal} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.inputLabel}>Why do you want to join our team?</Text>
            <TextInput
              style={styles.input}
              value={reason}
              onChangeText={setReason}
              placeholder="Enter your reason"
            />
            <TouchableOpacity style={styles.submitButton} onPress={handleJoinTeam}>
              <Text style={styles.submitButtonText}>Submit Request</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.submitButton, { marginTop: 10, backgroundColor: '#aaa' }]} onPress={() => setShowModal(false)}>
              <Text style={styles.submitButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    backgroundColor: '#003366',
    padding: 20,
    alignItems: 'center',
    flexDirection: 'row',
  },
  backButton: {
    position: 'absolute',
    left: 5,
  },
  backButtonText: {
    fontSize: 40,
    color: '#fff',
  },
  joinButton: {
    backgroundColor: '#003366',
    padding: 10,
    borderRadius: 5,
    marginTop: 20,
    alignItems: 'center',
  },
  joinButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    flex: 1,
    marginTop: 30,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: 'red',
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
  },
  noProjectContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noProjectText: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  projectDetailContainer: {
    padding: 20,
  },
  coverImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
    marginBottom: 20,
  },
  projectTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#003366',
    textAlign: 'center',
  },
  projectDescription: {
    fontSize: 16,
    marginBottom: 20,
    color: '#555',
    textAlign: 'center',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#003366',
  },
  personName: {
    fontSize: 16,
    marginLeft: 10,
    marginBottom: 5,
    color: '#555',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#003366',
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 20,
    paddingHorizontal: 10,
    borderRadius: 5,
    width: '100%',
  },
  submitButton: {
    backgroundColor: '#003366',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    width: '100%',
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default ProjectDetailScreen;
