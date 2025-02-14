// screens/HelpScreen.js
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import client from './../../../lib/contentful';

const HelpScreen = ({ route }) => {
  // If using React Navigation, you might get the slug from route.params
  // For now, let's hardcode the slug:
  const slug = "how-instant-book-works";
  
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        const response = await client.getEntries({
          content_type: 'helpArticle',
          'fields.slug': slug,
          limit: 1,
        });
        if (response.items && response.items.length > 0) {
          setArticle(response.items[0]);
        } else {
          setError("No article found for the given slug.");
        }
      } catch (err) {
        console.error("Error fetching article:", err);
        setError("An error occurred while fetching the article.");
      } finally {
        setLoading(false);
      }
    };

    fetchArticle();
  }, [slug]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text>Loading article...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  // Assuming your Contentful article has a `fields` object with properties like title and body.
  const { title, body } = article.fields;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{title || "Untitled Article"}</Text>
      <Text style={styles.body}>{body || "No content available."}</Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fff'
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  error: {
    color: 'red',
    fontSize: 16
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12
  },
  body: {
    fontSize: 16,
    lineHeight: 22
  }
});

export default HelpScreen;
