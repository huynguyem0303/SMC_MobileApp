import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import storeToken from '../../components/Jwt/storeToken'; // Adjust the import path as needed

const LoginStaffScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) {
      setErrorMessage('Email and password cannot be empty.');
      return;
    }

    setLoading(true);
    setErrorMessage(null); // Clear any previous error messages

    try {
      const response = await fetch('https://smnc.site/api/Auth/login', {
        method: 'POST',
        headers: {
          'Accept': '*/*',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();

      if (result.status) {
        const { access_token, user } = result.data;
        if (user.role === 5) {
          await storeToken(access_token);
           router.push('/StaffMenuScreen');
        } else {
          setErrorMessage('This role is for Event Staff only.');
        }
      } else {
        const errorMessage = result.errors ? result.errors.join(', ') : result.message || 'Login failed.';
        setPassword(''); // Clear the password field
        setErrorMessage(errorMessage);
      }
    } catch (error) {
      console.error('Login error:', error);
      setPassword(''); // Clear the password field
      setErrorMessage('Failed to login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Staff Login</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <View style={styles.passwordContainer}>
        <TextInput
          style={styles.passwordInput}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!passwordVisible}
        />
        <TouchableOpacity
          onPress={() => setPasswordVisible(!passwordVisible)}
          style={styles.eyeIcon}
        >
          <Text style={styles.eyeIconText}>{passwordVisible ? '👁️' : '🙈'}</Text>
        </TouchableOpacity>
      </View>
      {errorMessage && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      )}
      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Logging in...' : 'Login'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#003366',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  input: {
    width: '100%',
    padding: 10,
    backgroundColor: '#fff',
    marginBottom: 20,
    borderRadius: 5,
    height: 50, // Define a consistent height for email input
  },
  passwordContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 5,
    marginBottom: 20,
    height: 50, // Match the height with email input
  },
  passwordInput: {
    flex: 1,
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 5,
    height: '100%', // Ensure input fills the container height
  },
  eyeIcon: {
    padding: 10,
  },
  eyeIconText: {
    fontSize: 16, // Reduced font size for the eye icon
  },
  button: {
    width: '100%',
    padding: 15,
    backgroundColor: '#00cc00',
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 10, // Add space below login button
  },
  buttonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
  errorContainer: {
    marginBottom: 20,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
  },
  backButton: {
    width: '100%',
    padding: 15,
    backgroundColor: '#fff',
    marginTop:100,
    borderRadius: 5,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    color: '#003366',
  },
});

export default LoginStaffScreen;
