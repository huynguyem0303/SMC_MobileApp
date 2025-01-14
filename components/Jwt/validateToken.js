const validateToken = async (idToken) => {
    try {
      const response = await fetch(`https://smnc.site/api/Auth/google-login?googleIdToken=${idToken}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
  
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
  
      const data = await response.json();
  
      if (data.status === false) {
        console.error('Login failed:', data.message, data.errors);
        return null;
      }
      // console.log(data.data.access_token)
      return data.data.access_token;
    } catch (error) {
      console.error('Error validating token:', error);
      return null;
    }
  };
  
  export default validateToken;
  