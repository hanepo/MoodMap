// src/screens/admin/Documentation.js
// Admin Documentation - Upload and manage documentation files
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  SafeAreaView,
  Alert
} from 'react-native';
import { uploadDocumentation, getDocuments, deleteDocumentation } from '../../services/adminService';

export default function Documentation({ navigation }) {
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState([]);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    setLoading(true);
    const result = await getDocuments();
    if (result.ok) {
      setDocuments(result.data);
    } else {
      Alert.alert('Error', result.error || 'Failed to load documents');
    }
    setLoading(false);
  };

  const handleUploadDocument = async () => {
    Alert.alert(
      'Upload Document',
      'Enter document details to upload:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Simulate Upload',
          onPress: async () => {
            setUploading(true);

            // Simulate file upload
            const mockFile = {
              name: `Document_${Date.now()}.pdf`,
              size: `${(Math.floor(Math.random() * 3000000) / 1024 / 1024).toFixed(1)} MB`,
              type: 'application/pdf'
            };

            const result = await uploadDocumentation(mockFile);

            setUploading(false);

            if (result.ok) {
              Alert.alert('Success', 'Document uploaded successfully');
              loadDocuments(); // Reload to get fresh data
            } else {
              Alert.alert('Error', result.error || 'Failed to upload document');
            }
          }
        }
      ]
    );
  };

  const handleDeleteDocument = (doc) => {
    Alert.alert(
      'Delete Document',
      `Are you sure you want to delete "${doc.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteDocumentation(doc.id);
            if (result.ok) {
              Alert.alert('Success', 'Document deleted');
              loadDocuments();
            } else {
              Alert.alert('Error', result.error || 'Failed to delete document');
            }
          }
        }
      ]
    );
  };

  const handleViewDocument = (doc) => {
    Alert.alert(
      doc.name,
      'In a production app, this would open the document viewer or download the file.',
      [{ text: 'OK' }]
    );
  };

  const formatDate = (date) => {
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return 'Today';
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return `${days} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const renderDocument = ({ item }) => (
    <TouchableOpacity
      style={styles.docCard}
      onPress={() => handleViewDocument(item)}
    >
      <View style={styles.docLeft}>
        <View style={styles.docIconContainer}>
          <Text style={styles.docIcon}>{item.icon}</Text>
        </View>
        <View style={styles.docInfo}>
          <Text style={styles.docName}>{item.name}</Text>
          <View style={styles.docMeta}>
            <Text style={styles.docSize}>{item.size}</Text>
            <Text style={styles.docDot}>•</Text>
            <Text style={styles.docDate}>{formatDate(item.uploadedAt)}</Text>
          </View>
          <Text style={styles.docUploader}>Uploaded by {item.uploadedBy}</Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteDocument(item)}
      >
        <Text style={styles.deleteIcon}>🗑️</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📄</Text>
      <Text style={styles.emptyText}>No documents yet</Text>
      <Text style={styles.emptySubtext}>Upload your first document to get started</Text>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.infoCard}>
      <Text style={styles.infoIcon}>ℹ️</Text>
      <View style={styles.infoContent}>
        <Text style={styles.infoTitle}>Documentation Management</Text>
        <Text style={styles.infoText}>
          Upload and manage documentation files such as user guides, policies, and manuals.
          Supported formats: PDF, DOC, DOCX
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Documentation</Text>
        <TouchableOpacity
          style={styles.uploadButton}
          onPress={handleUploadDocument}
          disabled={uploading}
        >
          <Text style={styles.uploadIcon}>{uploading ? '⏳' : '📤'}</Text>
        </TouchableOpacity>
      </View>

      {/* Documents List */}
      <FlatList
        data={documents}
        renderItem={renderDocument}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmpty}
        ListHeaderComponent={renderHeader}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center'
  },
  backIcon: {
    fontSize: 32,
    color: '#330C2F',
    fontWeight: 'bold'
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#330C2F'
  },
  uploadButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center'
  },
  uploadIcon: {
    fontSize: 24
  },
  listContent: {
    padding: 20,
    flexGrow: 1
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6'
  },
  infoIcon: {
    fontSize: 24,
    marginRight: 12
  },
  infoContent: {
    flex: 1
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1E40AF',
    marginBottom: 4
  },
  infoText: {
    fontSize: 13,
    color: '#1E40AF',
    lineHeight: 18
  },
  docCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1
  },
  docLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  docIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  docIcon: {
    fontSize: 24
  },
  docInfo: {
    flex: 1
  },
  docName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4
  },
  docMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2
  },
  docSize: {
    fontSize: 13,
    color: '#6B7280'
  },
  docDot: {
    fontSize: 13,
    color: '#6B7280',
    marginHorizontal: 6
  },
  docDate: {
    fontSize: 13,
    color: '#6B7280'
  },
  docUploader: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic'
  },
  deleteButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center'
  },
  deleteIcon: {
    fontSize: 20
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 12
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280'
  }
});
