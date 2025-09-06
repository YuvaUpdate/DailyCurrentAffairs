// Debug function to test Firebase connection
export const testFirebaseConnection = async () => {
  console.log('🔬 Testing Firebase connection...');
  
  try {
    // Test 1: Check if Firebase is initialized
    console.log('🔬 Test 1: Firebase app state');
    const { getApps } = await import('@react-native-firebase/app');
    const apps = getApps();
    console.log('🔬 Firebase apps count:', apps.length);
    if (apps.length > 0) {
      console.log('🔬 Firebase app config:', apps[0].options);
    }
    
    // Test 2: Try to connect to Firestore
    console.log('🔬 Test 2: Firestore connection');
    const { db } = await import('./firebase.config');
    console.log('🔬 Firestore db object:', db);
    
    // Test 3: Try a simple read operation
    console.log('🔬 Test 3: Testing read operation');
    const { collection, getDocs } = await import('firebase/firestore');
    const testQuery = collection(db, 'news_articles');
    const snapshot = await getDocs(testQuery);
    console.log('🔬 Read test - documents count:', snapshot.size);
    
    // Test 4: Try a simple write operation
    console.log('🔬 Test 4: Testing write operation');
    const { addDoc, serverTimestamp } = await import('firebase/firestore');
    const testDoc = {
      test: true,
      timestamp: serverTimestamp(),
      message: 'Firebase connection test'
    };
    
    const docRef = await addDoc(collection(db, 'test_connection'), testDoc);
    console.log('🔬 Write test successful - doc ID:', docRef.id);
    
    // Test 5: Clean up test document
    console.log('🔬 Test 5: Cleaning up test document');
    const { deleteDoc, doc } = await import('firebase/firestore');
    await deleteDoc(doc(db, 'test_connection', docRef.id));
    console.log('🔬 Cleanup successful');
    
    console.log('✅ All Firebase tests passed!');
    return true;
    
  } catch (error) {
    console.error('❌ Firebase test failed:', error);
    console.error('❌ Error details:', {
      code: (error as any).code,
      message: (error as any).message,
      stack: (error as any).stack
    });
    return false;
  }
};

// Call this function from the console to test
(window as any).testFirebaseConnection = testFirebaseConnection;
