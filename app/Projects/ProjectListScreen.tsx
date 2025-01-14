import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Button } from 'react-native';
import { useRouter,useLocalSearchParams } from 'expo-router';
import RNPickerSelect from 'react-native-picker-select';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { checkToken } from '../../components/checkToken'; 
import { showSessionExpiredAlert } from '../../components/alertUtils'; 

type Project = {
  id: string;
  projectName: string;
  category: string;
  semesterAndCourse: { semester: string; course: string };
  mentorsAndLecturers: { name: string; roleType: string }[];
  memberWantedStatus: boolean;
  memberWanted: string | null;
  isDeleted:boolean;
};

const ProjectListScreen = () => {
  const { semesterId,courseId} = useLocalSearchParams();
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [selectedMemberWanted, setSelectedMemberWanted] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const projectsPerPage = 10;
  const router = useRouter();

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    filterProjects();
  }, [selectedCategory, selectedCourse, selectedMemberWanted, projects, currentPage]);
  semesterId
  const fetchProjects = async () => { 
    try {
      const token = await checkToken();
      if (token === null) {
        showSessionExpiredAlert(router);
        return;
    }
      const response = await fetch(`https://smnc.site/api/Projects?PageSize=50&courseId=${courseId}&semesterId=${semesterId}`, {
        method: 'GET',
        headers: {
          'accept': 'text/plain',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      const filteredProjects = data.data.data.filter((project: Project) => !project.isDeleted);
      setProjects(filteredProjects);
      // console.log(data.data.data);
      setLoading(false);
    } catch (error) {
      console.log('Error fetching project data:', error);
      setLoading(false);
    }
  };
  const filterProjects = () => {
    let filtered = projects.filter(project => project.memberWantedStatus);

    if (selectedCategory) {
      filtered = filtered.filter(project => project.category === selectedCategory);
    }

    if (selectedCourse) {
      filtered = filtered.filter(project => {
        const sc = project.semesterAndCourse;
        if (selectedCourse === 'Others') {
          return sc.course !== 'EXE101' && sc.course !== 'EXE201';
        }
        return sc.course === selectedCourse;
      });
    }

    if (selectedMemberWanted) {
      filtered = filtered.filter(project => {
        const memberWantedArray = project.memberWanted ? project.memberWanted.split(',').map(item => item.trim().toLowerCase()).filter(Boolean) : [];
        return memberWantedArray.includes(selectedMemberWanted.toLowerCase());
      });
    }

    const startIndex = (currentPage - 1) * projectsPerPage;
    const paginatedProjects = filtered.slice(startIndex, startIndex + projectsPerPage);
    setFilteredProjects(paginatedProjects);
  };

  const renderProjectItem = ({ item }: { item: Project }) => {
    const mentors = item.mentorsAndLecturers.filter((person) => person.roleType === 'Mentor');
    const lecturers = item.mentorsAndLecturers.filter((person) => person.roleType === 'Lecturer');
    const memberWantedArray = item.memberWanted ? item.memberWanted.split(',').map(role => role.trim()).filter(Boolean) : [];
    const { semester, course } = item.semesterAndCourse;
  
    return (
      <View style={styles.projectContainer}>
        <View style={styles.projectDetails}>
          <Text style={styles.projectTitle}>{item.projectName || 'No Project Name'}</Text>
          
          <View style={styles.inlineTextWrap}>
            <Text style={styles.projectSectionTitle}>Lecturers:</Text>
            {lecturers.map((lecturer, index) => (
              <Text key={index} style={styles.personName}>{lecturer.name}</Text>
            ))}
          </View>
          
          <View style={styles.inlineTextWrap}>
            <Text style={styles.projectSectionTitle}>Mentors:</Text>
            {mentors.map((mentor, index) => (
              <Text key={index} style={styles.personName}>{mentor.name}</Text>
            ))}
          </View>
          
          <View style={styles.inlineTextWrap}>
            <Text style={styles.projectSectionTitle}>Course:</Text>
            <Text style={styles.personName}>{course}</Text>
          </View>
          
          <View style={styles.inlineTextWrap}>
            <Text style={styles.projectSectionTitle}>Category:</Text>
            <Text style={styles.personName}>{item.category}</Text>
          </View>
          
          <View style={styles.inlineTextWrap}>
            <Text style={styles.projectSectionTitle}>Recruitment requirements:</Text>
            {memberWantedArray.length > 0 ? (
              memberWantedArray.map((role, index) => (
                <Text key={index} style={styles.personName}>{role}</Text>
              ))
            ) : (
              <Text style={styles.personName}>No roles listed</Text>
            )}
          </View>
          
          <TouchableOpacity style={styles.detailButton} onPress={() => handleDetail(item)}>
            <Text style={styles.detailButtonText}>Check Detail</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };  
  const handleDetail = (project: Project) => {
    router.push(`/Projects/ProjectDetailScreen?projectId=${project.id}`);
  };
  const handleNextPage = () => {
    if (currentPage < Math.ceil(projects.length / projectsPerPage)) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };
  if (loading) {
    return <ActivityIndicator size="large" color="#0000ff" />;
  }
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={router.back} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerText}>Project List</Text>
      </View>
      <View style={styles.pickerContainer}>
        <View style={styles.pickerBorder}>
          <RNPickerSelect
            onValueChange={(value) => setSelectedCategory(value)}
            items={[
              { label: 'Healthcare', value: 'Healthcare' },
              { label: 'Fintech', value: 'Fintech' },
              { label: 'Sharing Economy', value: 'SharingEconomy' },
              { label: 'Edtech', value: 'Edtech' },
              { label: 'ECommerce', value: 'ECommerce' },
              { label: 'SaaS', value: 'SaaS' },
              { label: 'Green Tech', value: 'GreenTech' },
              { label: 'AI and Machine Learning', value: 'AIAndMachineLearning' },
              { label: 'Proptech', value: 'Proptech' },
              { label: 'Agtech', value: 'Agtech' },
              { label: 'Logistics and Supply Chain', value: 'LogisticsAndSupplyChain' },
              { label: 'Entertainment & Media', value: 'EntertainmentAndMedia' },
              { label: 'Mobility', value: 'Mobility' },
              { label: 'Cybersecurity', value: 'Cybersecurity' },
              { label: 'Others', value: 'Others' },
            ]}
            placeholder={{ label: 'Select a category', value: '' }}
            style={pickerSelectStyles}
          />
        </View>
        <View style={styles.pickerBorder}>
          <RNPickerSelect
            onValueChange={(value) => setSelectedMemberWanted(value)}
            items={[
              { label: 'FE', value: 'FE' },
              { label: 'BE', value: 'BE' },
              { label: 'Mobile', value: 'Mobile' },
              { label: 'UI/UX', value: 'UI/UX' },
              { label: 'Marketing', value: 'Marketing' },
            ]}
            placeholder={{ label: 'Select member role wanted', value: null }}
            style={pickerSelectStyles}
          />
        </View>
      </View>
      {filteredProjects.length > 0 ? (
        <>
                    <FlatList
            data={filteredProjects}
            renderItem={renderProjectItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContentContainer}
          />
          <View style={styles.paginationContainer}>
            <Button title="Previous" onPress={handlePreviousPage} disabled={currentPage === 1} />
            <Text style={styles.paginationText}>Page {currentPage}</Text>
            <Button title="Next" onPress={handleNextPage} disabled={currentPage >= Math.ceil(projects.length / projectsPerPage)} />
          </View>
        </>
      ) : (
        <Text style={styles.noProjectsText}>Project not found</Text>
      )}
    </View>
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
    detailButton: {
        backgroundColor: '#003366',
        padding: 10,
        borderRadius: 5,
        marginTop: 20,
        alignItems: 'center',
      },
    headerText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        textAlign: 'center',
        flex: 1,
        marginTop: 30,
    },
    pickerContainer: {
        padding: 10,
    },
    pickerBorder: {
        borderWidth: 1,
        borderColor: '#000',
        borderRadius: 5,
        marginBottom: 10,
    },
    listContentContainer: {
        padding: 10,
    },
    projectContainer: {
        flexDirection: 'row',
        marginBottom: 15,
        padding: 10,
        backgroundColor: '#f9f9f9',
        borderRadius: 5,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    projectDetails: {
        flex: 1,
        justifyContent: 'center',
    },
    projectTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 10,
        textAlign: 'center',
    },
    projectCategory: {
        fontSize: 18,
        marginBottom: 10,
    },
    projectSectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    personName: {
        fontSize: 16,
        marginLeft: 10,
    },
    detailButtonText: {
        color: '#fff',
        fontWeight: 'bold',
      },
    inlineTextWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        flexWrap: 'wrap',
    },
    noProjectsText: {
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        marginTop: 20,
        color: '#333',
    },
    paginationContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 10,
    },
    paginationText: {
        fontSize: 16,
        fontWeight: 'bold',
    }
});
const pickerSelectStyles = StyleSheet.create({
    inputIOS: {
        fontSize: 16,
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderWidth: 1,
        borderColor: 'gray',
        borderRadius: 4,
        color: 'black',
        paddingRight: 30,
        height: 40
    },
    inputAndroid: {
        fontSize: 16,
        paddingHorizontal: 6,
        paddingVertical: 8,
        borderWidth: 0.5,
        borderColor: 'gray',
        borderRadius: 8,
        color: 'black',
        paddingRight: 30,
        height: 40

    },
});
export default ProjectListScreen;