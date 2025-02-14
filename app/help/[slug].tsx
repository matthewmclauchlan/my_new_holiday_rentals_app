import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import client from '../../lib/contentful';
import type { HelpArticle } from '../../lib/types';
import renderRichText from '../../lib/renderRichText';

export default function HelpArticleScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();

  const [article, setArticle] = useState<HelpArticle | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        const response = await client.getEntries({
          content_type: 'helpArticle',
          'fields.slug': slug,
          limit: 1,
        });
        if (response.items && response.items.length > 0) {
          setArticle(response.items[0] as unknown as HelpArticle);
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

  // Log the fields to check their keys.
  console.log("Article fields:", article?.fields);

  // Use lowercase "content" if that's what your type defines.
  const { title, content } = article!.fields;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{title || "Untitled Article"}</Text>
      {content ? renderRichText(content) : <Text>No content available.</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  error: { color: 'red', fontSize: 16 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 12 },
});
