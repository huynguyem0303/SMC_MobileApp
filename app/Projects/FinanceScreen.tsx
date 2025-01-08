import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Modal, Image, Button, TextInput, ActivityIndicator } from 'react-native';
import RNPickerSelect from 'react-native-picker-select';
import DocumentPicker, { DocumentPickerResponse } from 'react-native-document-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Transaction = {
    id: string;
    description: string;
    amount: number;
    transactionDate: string;
    imageUrl: string | null;
    isDeleted: boolean;
};

const FinanceScreen = () => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [remaining, setRemaining] = useState(0);
    const [total, setTotal] = useState(0);
    const [cashOut, setCashOut] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [modalVisible, setModalVisible] = useState(false);
    const [imageModalVisible, setImageModalVisible] = useState(false);
    const [currentImage, setCurrentImage] = useState<string | null>(null);
    const [description, setDescription] = useState('');
    const [type, setType] = useState('cashIn');
    const [amount, setAmount] = useState('');
    const [imageFile, setImageFile] = useState<{ uri: string; type: string; name: string;size:number } | null>(null);
    const pageSize = 10;
    const { projectId } = useLocalSearchParams();
    const id = String(projectId);
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [isLeader, setIsLeader] = useState(false);


    const fetchTransactions = async () => {
        try {
            setTotal(0);
            const token = await AsyncStorage.getItem('@userToken');
            const storedIsLeader = await AsyncStorage.getItem('@isLeader');
            setIsLeader(storedIsLeader === 'true');
            if (!token) {
                Alert.alert('Error', 'User token is required');
                return;
            }
            if (!id) {
                Alert.alert('Error', 'Project ID is required');
                return;
            }

            const response = await fetch(`https://smnc.site/api/Financial/transactions?ProjectId=${id}`, {
                headers: {
                    'accept': '*/*',
                    'Authorization': `Bearer ${token}`,
                },
            });
            const json = await response.json();

            if (json.status) {
                const filteredTransactions = json.data.transactions.data.filter((transaction: Transaction) => !transaction.isDeleted);
                const total = filteredTransactions
                .filter((transaction: Transaction) => transaction.amount >= 0)
                .reduce((acc: number, transaction: Transaction) => acc + transaction.amount, 0);
                setTotal(total);
                setRemaining(json.data.total);
                setCashOut(json.data.cashOut);
                setTransactions(filteredTransactions);
            } else {
                Alert.alert('Error', json.message);
            }
        } catch (error) {
            console.error('Error fetching transactions:', error);
            Alert.alert('Error', 'Failed to fetch transactions');
        }
    };

    useEffect(() => {
        fetchTransactions();
    }, []);

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    const handleDelete = async (transactionId: string) => {
        try {
            const token = await AsyncStorage.getItem('@userToken');
            const response = await fetch(`https://smnc.site/api/Financial/transaction/${transactionId}`, {
                method: 'DELETE',
                headers: {
                    'accept': '*/*',
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.status === 204) {
                Alert.alert('Success', 'Transaction deleted successfully');
                fetchTransactions(); // Refresh transactions
            } else {
                Alert.alert('Error', 'Failed to delete transaction');
            }
        } catch (error) {
            console.error('Error deleting transaction:', error);
            Alert.alert('Error', 'Failed to delete transaction');
        }
    };

    const confirmDelete = (transactionId: string) => {
        Alert.alert(
            'Confirm Delete',
            'Are you sure you want to delete this transaction?',
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Confirm',
                    onPress: () => handleDelete(transactionId),
                },
            ],
            { cancelable: false }
        );
    };

    const handleCreate = async () => {
        if (!description) {
            Alert.alert('Error', 'Description cannot be empty');
            return;
        }
        if (description.length > 200) {
            Alert.alert('Error', 'Description must be under 200 characters');
            return;
        }
        if (!amount) {
            Alert.alert('Error', 'Amount cannot be empty');
            return;
        }
        const amountNumber = parseFloat(amount);
        if (isNaN(amountNumber) || amountNumber < 1000 || amountNumber >= 1000000000) {
            Alert.alert('Error', 'Amount must be a number greater than 1000 and less than 1,000,000,000');
            return;
        }
        if (!imageFile || !['image/png', 'image/jpeg', 'image/jpg'].includes(imageFile.type)) {
            Alert.alert('Error', 'Please upload a valid image file (.png, .jpeg, .jpg)');
            return;
        }
        if (type === 'cashOut' && amountNumber > remaining) {
            Alert.alert('Error', 'Cash Out amount must not be greater than the total');
            return;
        }
    
        // Change image/jpeg to image/jpg
        const fileType = imageFile.type === 'image/jpeg' ? 'image/jpg' : imageFile.type;
    
        // Split the file name to get the base name without extension
        const baseFileName = imageFile.name.split('.').slice(0, -1).join('.');
    
        setLoading(true); // Start loading
        try {
            const token = await AsyncStorage.getItem('@userToken');
            const formData = new FormData();
            formData.append('ProjectId', id);
            formData.append('Description', description);
            formData.append('Amount', type === 'cashIn' ? amountNumber.toString() : (-amountNumber).toString());
            formData.append('TransactionDate', new Date().toISOString());
            formData.append('ImageFile', {
                uri: imageFile.uri,
                type: fileType,
                name: imageFile.name, // Use the base file name without extension
            } as any);
    
            const response = await fetch('https://smnc.site/api/Financial/addTransaction', {
                method: 'POST',
                headers: {
                    'accept': 'text/plain',
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data',
                },
                body: formData,
            });
    
            if (response.status === 200) {
                Alert.alert('Success', `Transaction created successfully`);
                setModalVisible(false);
                fetchTransactions(); // Refresh transactions
                // Reset all input fields
                setDescription('');
                setAmount('');
                setType('cashIn');
                setImageFile(null);
            } else {
                Alert.alert('Error', 'Failed to create transaction');
            }
        } catch (error: any) {
            console.error('Error creating transaction:', error);
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false); // Stop loading
        }
    };
        
    const pickDocument = async () => {
        try {
            const result: DocumentPickerResponse[] = await DocumentPicker.pick({
                type: [DocumentPicker.types.images],
            });
    
            if (result.length > 0) {
                const file = result[0];
                const fileName = file.name || 'Untitled';
                const fileType = file.type?.split('/').pop() || '';
                const fileSize = file.size || 0; // Get the file size
    
                // Check if the file size is greater than 3MB (3 * 1024 * 1024 bytes)
                if (fileSize > 2 * 1024 * 1024) {
                    Alert.alert('Error', 'File size must be less than 2MB');
                    return;
                }
                
                // Check if the file name already has an extension
                const fullFileName = fileName.match(/\.[0-9a-z]+$/i) ? fileName : `${fileName}.${fileType}`;
    
                setImageFile({
                    uri: file.uri || 'Untitled',
                    type: file.type || '',
                    name: fullFileName,
                    size: fileSize,
                });
            } else {
                Alert.alert('Error', 'No file selected');
            }
        } catch (err) {
            if (DocumentPicker.isCancel(err)) {
                Alert.alert('Error', 'No file selected');
            } else {
                Alert.alert('Error', 'Unknown error occurred');
            }
        }
    };
    
    
    
    const renderTransactions = () => {
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        const pageTransactions = transactions.slice(startIndex, endIndex);

        return pageTransactions.map((transaction) => (
            <View key={transaction.id} style={styles.transactionContainer}>
                <View style={styles.transactionDetails}>
                    <Text style={styles.transactionDetail}>Description: {transaction.description}</Text>
                    <Text style={styles.transactionDetail}>Amount: {transaction.amount >= 0 ? `+${transaction.amount}` : transaction.amount} VND</Text>
                    <Text style={styles.transactionDetail}>
                        Date: {new Date(transaction.transactionDate).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                        })}
                    </Text>
                    {transaction.imageUrl && (
                        <TouchableOpacity onPress={() => {
                            if (transaction.imageUrl) {
                                setCurrentImage(transaction.imageUrl);
                                setImageModalVisible(true);
                            } else {
                                Alert.alert('Error', 'No Image available');
                                console.log(transaction.imageUrl);
                            }
                        }}>
                            <Text style={styles.imageLink}>View Image</Text>
                        </TouchableOpacity>
                    )}
                </View>
                {isLeader && (
                    <TouchableOpacity onPress={() => confirmDelete(transaction.id)} style={styles.iconContainer}>
                        <Image source={require('../../assets/images/trash-icon.png')} style={styles.icon} />
                    </TouchableOpacity>
                )}
            </View>
        ));
    };
    const formattedTotal = new Intl.NumberFormat('de-DE').format(total);
    const formattedCashOut = new Intl.NumberFormat('de-DE').format(Math.abs(cashOut));
    const formattedRemaining = new Intl.NumberFormat('de-DE').format(remaining);
    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={router.back} style={styles.backButton}>
                    <Text style={styles.backButtonText}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerText}>Finance</Text>
            </View>
            <ScrollView contentContainerStyle={styles.scrollViewContent}>
                {isLeader && (
                    <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addButton}>
                        <Image source={require('../../assets/images/add-icon.png')} style={styles.addIcon} />
                    </TouchableOpacity>
                )}
                <View style={styles.inlineContainer}>
                    <Text style={styles.title}>Total: {formattedTotal} VND</Text>
                  
                </View>
                <View style={styles.inlineContainer1}>
                <Text style={styles.title}>Cash Out: {formattedCashOut} VND</Text>
                   </View>
                <View style={styles.inlineContainer1}>
                    <Text style={styles.title}>Remaining: {formattedRemaining} VND</Text>
                </View>
                
                {renderTransactions()}
            </ScrollView>
            <View style={styles.pagination}>
                {Array.from({ length: Math.ceil(transactions.length / pageSize) }, (_, index) => (
                    <TouchableOpacity key={index} onPress={() => handlePageChange(index + 1)}>
                        <Text style={currentPage === index + 1 ? styles.activePage : styles.pageNumber}>{index + 1}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => {
                    setModalVisible(!modalVisible);
                }}>
                <View style={styles.modalContainer}>
                    <View style={styles.modalView}>
                        {loading ? (
                            <ActivityIndicator size="large" color="#003366" />
                        ) : (
                            <>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Description"
                                    value={description}
                                    onChangeText={setDescription}
                                    maxLength={200}
                                />
                                <RNPickerSelect
                                    onValueChange={(value) => setType(value)}
                                    items={[
                                        { label: 'Cash In', value: 'cashIn' },
                                        { label: 'Cash Out', value: 'cashOut' },
                                    ]}
                                    style={pickerSelectStyles}
                                    value={type}
                                />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Amount"
                                    value={amount}
                                    onChangeText={setAmount}
                                    keyboardType="numeric"
                                />
                                <View style={styles.uploadContainer}>
                                    <Text style={styles.fileText}>Choose File</Text>
                                    <TouchableOpacity style={styles.uploadButtonPopup} onPress={pickDocument}>
                                    <Text style={styles.uploadButtonText}>{imageFile ? `${imageFile.name}` : 'No file chosen'}</Text>
                                    </TouchableOpacity>
                                </View>
                                <View style={styles.buttonContainer}>
                                    <TouchableOpacity style={styles.saveButton} onPress={handleCreate}>
                                        <Text style={styles.saveButtonText}>Create</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}>
                                        <Text style={styles.cancelButtonText}>Cancel</Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}
                    </View>
                </View>
            </Modal>

            <Modal
                animationType="slide"
                transparent={true}
                visible={imageModalVisible}
                onRequestClose={() => setImageModalVisible(false)}
            >
                <View style={styles.fullImageModalContainer}>
                    <View style={styles.fullImageModalView}>
                        <Image source={{ uri: currentImage || 'default_image_uri' }} style={styles.fullImage} resizeMode="contain" />
                        <TouchableOpacity style={styles.closeButton} onPress={() => setImageModalVisible(false)}>
                            <Text style={styles.closeButtonText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>




        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1,backgroundColor: '#ffffff' },
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
    addButton: {
        position: 'absolute',
        right: 5,
    },
    addIcon: {
        marginTop: 10,
        width: 24,
        height: 24,
    },
    inlineContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 40,
        marginBottom:10
    },
    inlineContainer1: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
        marginBottom:15
    },
    title: { fontSize: 18, fontWeight: 'bold', marginLeft: 30 },
    remaintitle: { fontSize: 18, fontWeight: 'bold', marginLeft: 100, marginTop: 15, marginBottom: 15 },
    transactionContainer: {
        marginLeft: 20,
        marginRight: 20,
        marginBottom: 20,
        padding: 15,
        backgroundColor: '#d3d3d3', // Brighter background color
        borderRadius: 5,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    transactionDetails: { flex: 1 },
    transactionDetail: { fontSize: 16 },
    iconContainer: { marginLeft: 10 },
    icon: { width: 24, height: 24 },
    scrollViewContent: { paddingBottom: 20 },
    pagination: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
    pageNumber: { margin: 5, fontSize: 16 },
    activePage: { margin: 5, fontSize: 16, fontWeight: 'bold', color: 'blue' },
    fullImage: {
        width: 300,
        height: 300,
        marginBottom: 20,
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalView: {
        width: '80%',
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 20,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    input: {
        width: '100%',
        padding: 10,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 5,
        marginBottom: 10,
    },
    uploadContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
    },
    fileText: {
        fontSize: 16,
        color: '#000000',
    },
    uploadButtonPopup: {
        width: 220,
        height: 40,
        backgroundColor: '#003366',
        padding: 10,
        borderRadius: 5,
        marginLeft: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    uploadButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    buttonContainer: {
        marginTop: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
    },
    saveButton: {
        backgroundColor: '#4CAF50',
        padding: 10,
        borderRadius: 5,
        flex: 1,
        alignItems: 'center',
        marginRight: 5,
    },
    saveButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
    cancelButton: {
        backgroundColor: '#f44336',
        padding: 10,
        borderRadius: 5,
        flex: 1,
        alignItems: 'center',
        marginLeft: 5,
    },
    cancelButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
    button: {
        backgroundColor: '#003366',
        padding: 10,
        borderRadius: 5,
        alignItems: 'center',
        marginBottom: 10,
        width: '100%', // Make the button as wide as the input
    },
    buttonText: {
        color: 'white',
        fontWeight: 'bold',
    }, imageLink: { color: 'blue', textDecorationLine: 'underline', marginBottom: 10, },
    fullImageModalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.8)',
    },
    fullImageModalView: {
        width: '90%',
        height: '90%',
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    closeButton: {
        backgroundColor: '#f44336',
        padding: 10,
        borderRadius: 5,
        alignItems: 'center',
        marginTop: 20,
    },
    closeButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },

});

const pickerSelectStyles = StyleSheet.create({
    inputIOS: {
        width: '100%',
        padding: 10,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 5,
        marginBottom: 10,
        color: 'black',
    },
    inputAndroid: {
        width: '100%',
        padding: 10,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 5,
        marginBottom: 10,
        color: 'black',
    },
});

export default FinanceScreen;


