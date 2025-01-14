import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { checkToken } from '../../components/checkToken'; 
import { showSessionExpiredAlert } from '../../components/alertUtils'; 
interface Project {
    id:string,
    projectName: string;
    projectCode: string;
    mentorsAndLecturers: { name: string; roleType: string }[];
    category: string;
}

const MentorLecturerProjectListScreen = () => {
    const router = useRouter();

    const [projects, setProjects] = useState<Project[]>([]);
    const [role, setRole] = useState<string | null>(null);
    const [id, setId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [leaderName, setLeaderName] = useState<string | null>(null);

    const fetchProjects = async () => {
        try {
            const token = await checkToken();
            if (token === null) {
                showSessionExpiredAlert(router);
                return;
            }

            const storedRole = await AsyncStorage.getItem('@role');
            const storedId = await AsyncStorage.getItem('@id');

            // console.log('Token:', token);
            // console.log('Role:', storedRole);
            // console.log('ID:', storedId);
            
            if (token && storedRole && storedId) {
                const parsedRole = JSON.parse(storedRole).toLowerCase();
                const parsedId = JSON.parse(storedId);

                setRole(parsedRole);
                setId(parsedId);

                let url = '';

                if (parsedRole === 'mentor') {
                    url = `https://smnc.site/api/Projects?mentorId=${parsedId}`;
                } else if (parsedRole === 'lecturer') {
                    url = `https://smnc.site/api/Projects?lecturerId=${parsedId}`;
                }

                // console.log('URL:', url);

                if (url) {
                    const response = await fetch(url, {
                        method: 'GET',
                        headers: {
                            'accept': 'text/plain',
                            'Authorization': `Bearer ${token}`,
                        },
                    });
                    const data = await response.json();
                    // console.log('Response Data:', data);
                    
                    setProjects(data.data.data); // Adjusting the path to the correct location

                    // Find the leader's name
                    const leader = data.data.data[0].team.members.find((member: any) => member.isLeader);
                    if (leader) {
                        setLeaderName(leader.studentName);
                    }

                    setLoading(false); // Set loading to false after data is fetched
                }
            }
        } catch (error) {
            console.log('Error fetching project data:', error);
            setLoading(false); // Set loading to false in case of error
        }
    };

    useEffect(() => {
        fetchProjects();
    }, []);

    const handleDetail = (projectId: any) => {
        router.push({
            pathname: './MentorLecturerProjectDetailScreen',
            params: {
                projectId: projectId,
            },
        });
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <Text>Loading...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={router.back} style={styles.backButton} >
                    <Text style={styles.backButtonText} >←</Text>
                </TouchableOpacity>
                <Text style={styles.headerText}>Project List</Text>
            </View>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {projects && projects.length > 0 ? (
                    projects.map((item, index) => (
                        <TouchableOpacity key={index} style={styles.projectContainer} onPress={() => handleDetail(item.id)}>
                            <View style={styles.projectDetails}>
                                <Text style={styles.projectTitle}>{item.projectName || 'No Project Name'}</Text>
                                <View style={styles.inlineTextWrap}>
                                    <Text style={styles.projectSectionTitle}>Project Code:</Text>
                                    <Text style={styles.personName}>{item.projectCode}</Text>
                                </View>
                                <View style={styles.inlineTextWrap}>
                                    <Text style={styles.projectSectionTitle}>Category:</Text>
                                    <Text style={styles.personName}>{item.category}</Text>
                                </View>

                                {leaderName && (
                                    <View style={styles.inlineTextWrap}>
                                        <Text style={styles.projectSectionTitle}>Team Leader:</Text>
                                        <Text style={styles.personName}>{leaderName}</Text>
                                    </View>
                                )}
                            </View>
                        </TouchableOpacity>
                    ))
                ) : (
                    <Text>No projects available.</Text>
                )}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    scrollContent: {
        padding: 16,
    },
    header: {
        backgroundColor: '#003366',
        alignItems: 'center',
        flexDirection: 'row',
        height: 90,
        width: '100%',
        paddingHorizontal: 10,
    },
    backButton: {
        position: 'absolute',
        left: 5,
        top:16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    backButtonText: {
        fontSize: 40, 
        color: '#fff',
    },
    inlineContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerText: {
        marginLeft:-10,
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        textAlign: 'center',
        flex: 1,
        marginTop: 30,
    },
    projectContainer: {
        marginBottom: 16,
        padding: 16,
        backgroundColor: '#d3d3d3',
        borderRadius: 8,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
    },
    projectDetails: {},
    projectTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    inlineTextWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
    },
    projectSectionTitle: {
        fontWeight: 'bold',
    },
    personName: {
        marginLeft: 8,
        flex: 1,
    },
});

export default MentorLecturerProjectListScreen;
