import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput, Alert } from 'react-native';
import axios from 'axios';
import { useRouter } from 'expo-router';
import RNPickerSelect from 'react-native-picker-select';

type Event = {
  id: string;
  title: string;
  description: string;
  type: number;
  coverImage: string;
  startDate: string;
  endDate: string;
  location: string;
  tag: string;
  registrationLink: string;
  isMandatory: boolean;
};

const EventListScreen = () => {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [resultCount, setResultCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMandatory, setIsMandatory] = useState<boolean | null>(null);

  useEffect(() => {
    fetchEvents(searchQuery, isMandatory);
  }, [searchQuery, isMandatory]);

  const fetchEvents = async (searchTerm = '', isMandatory: boolean | null = null) => {
    if (loading) return;

    setLoading(true);
    try {
      const response = await axios.get('https://smnc.site/api/Events', {
        params: {
          SearchTerm: searchTerm,
          IsMandatory: isMandatory !== null ? isMandatory : undefined
        }
      });

      const { data } = response.data.data;

      if (Array.isArray(data)) {
        setEvents(data);
        setTotalPages(Math.ceil(data.length / 10)); // Calculate total pages based on number of events and 10 events per page
        setResultCount(data.length); // Update result count
      } else {
        console.error('Unexpected data format:', data);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEventType = (type: number) => {
    switch (type) {
      case 0:
        return 'Seminar';
      case 1:
        return 'Workshop';
      case 2:
        return 'Meeting';
      default:
        return 'Unknown';
    }
  };

  const getEventsForPage = (page: number) => {
    const startIndex = (page - 1) * 10;
    const endIndex = page * 10;
    return events.slice(startIndex, endIndex);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const getFormattedEndDate = (endDateString: string) => {
    const date = new Date(endDateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-based
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const renderEventItem = ({ item }: { item: Event }) => (
    <View style={styles.eventContainer}>
      {item.coverImage ? (
                <Image source={{ uri: item.coverImage }} style={styles.eventImage} />
            ) : (
                <Text style={styles.noImageText}>No image available</Text>
            )}
      <View style={styles.eventDetails}>
        <Text style={styles.eventTitle}>{item.title}</Text>
        <View style={styles.inlineText}>
          <Text style={styles.Type}>Type:</Text>
          <Text style={styles.eventDescription}> {getEventType(item.type)}</Text>
        </View>
        <View style={styles.inlineText}>
          <Text style={styles.Type}>Time:</Text>
          <Text style={styles.eventDate}> {formatTime(item.startDate)} - {formatTime(item.endDate)}</Text>
        </View>
        <View style={styles.inlineText}>
          <Text style={styles.Type}>On: </Text>
          <Text style={styles.eventDate}>{getFormattedEndDate(item.endDate)}</Text>
        </View>
        <View style={styles.inlineText}>
          <Text style={styles.Location}>Location:</Text>
          <View style={styles.locationContainer}>
            <Text style={styles.eventLocation}>{item.location}</Text>
          </View>
        </View>
        <Text style={styles.tag}>{item.tag}</Text>
        <Text style={styles.mandatory}>Priority: {item.isMandatory ? 'Mandatory' : 'Optional'}</Text>
        <TouchableOpacity style={styles.registrationButton} onPress={() => handleRegister(item)}>
          <Text style={styles.registrationButtonText}>Check Detail</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const handleRegister = (event: Event) => {
    router.push(`/Events/EventDetailScreen?id=${event.id}`);
  };

  const handleBack = () => {
    router.back();
  };

  const handleSearch = () => {
    setPage(1); // Reset to the first page
    fetchEvents(searchQuery, isMandatory);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerText}>Event List</Text>
      </View>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchBar}
          placeholder="Search Events..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Image
            source={require('../../assets/images/search-icon.png')}
            style={styles.searchIcon}
          />
        </TouchableOpacity>
      </View>
      <View style={styles.pickerContainer}>
        <RNPickerSelect
          onValueChange={(value) => setIsMandatory(value === 'true')}
          items={[
            { label: 'Optional', value: 'false' },
            { label: 'Mandatory', value: 'true' },
          ]}
          placeholder={{ label: 'Priority', value: null }}
          style={pickerSelectStyles}
        />
      </View>
      {resultCount > 0 && (
        <Text style={styles.resultText}>Showing {resultCount} results</Text>
      )}
      {loading && <ActivityIndicator size="large" color="#0000ff" />}
      <FlatList
        data={getEventsForPage(page)}
        renderItem={renderEventItem}
        keyExtractor={(item) => item.id}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
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
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    flex: 1,
    marginTop: 30,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    marginBottom: 15,
  },
  searchBar: {
    flex: 1,
    padding: 10,
    fontSize: 16,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 20,
    backgroundColor: '#fff',
  },
  searchButton: {
    padding: 10,
    marginLeft: 10,
    backgroundColor: '#003366',
    borderRadius: 20,
  },
  searchIcon: {
    width: 20,
    height: 20,
  },
  pickerContainer: {
    marginVertical: 10,
    paddingHorizontal: 10,
    height: 40, // Reduced height for picker container
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    backgroundColor: '#fff',
    justifyContent: 'center', // Center the content vertically
  },
  pickerLabel: {
    fontSize: 16, // Adjusted font size
    fontWeight: 'bold',
    color: '#333333',
  },
  resultText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  eventContainer: {
    flexDirection: 'row',
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  eventImage: {
    width: 100,
    height: 100,
    borderRadius: 5,
    marginRight: 10,
  },
  eventDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  eventTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  inlineText: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 5,
    flexWrap: 'wrap',
  },
  Type: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  tag: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  eventDescription: {
    fontSize: 16,
    marginLeft: 5,
  },
  Date: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  eventDate: {
    fontSize: 16,
    marginLeft: 5,
  },
  locationContainer: {
    flex: 1,
    marginLeft: 5,
  },
  Location: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  eventLocation: {
    fontSize: 16,
    marginLeft: 5,
    flexShrink: 1,
  },
  mandatory: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF0000', // Red color to highlight importance
    marginTop: 5,
  },
  registrationButton: {
    backgroundColor: '#003366',
    padding: 10,
    borderRadius: 5,
    marginTop: 20,
    alignItems: 'center',
  },
  registrationButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  noImageText: {
    fontSize: 16,
    color: 'gray',
    marginEnd: 10,
    marginTop:130
}
});

const pickerSelectStyles = {
  inputIOS: {
    fontSize: 16,
    paddingVertical: 8, // Reduced padding for smaller height
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    color: 'black',
    paddingRight: 30, // to ensure the text is never behind the icon
  },
  inputAndroid: {
    fontSize: 16,
    paddingHorizontal: 10,
    paddingVertical: 8, // Reduced padding for smaller height
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    color: 'black',
    paddingRight: 30, // to ensure the text is never behind the icon
  },
  placeholder: {
    color: '#999',
  },
};

export default EventListScreen;