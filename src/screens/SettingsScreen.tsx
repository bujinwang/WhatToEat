import React, { useState, useEffect } from 'react';
import { View, Text, Switch, StyleSheet, Button, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SettingsScreen({ navigation }) {
  // 吃
  const [vegetarian, setVegetarian] = useState(false);
  const [likesSpicy, setLikesSpicy] = useState(true);
  const [prefersNoodles, setPrefersNoodles] = useState(true);
  // 喝
  const [likesMilkTea, setLikesMilkTea] = useState(false);
  const [likesCoffee, setLikesCoffee] = useState(false);
  const [lowSugar, setLowSugar] = useState(false);
  // 玩
  const [likesOutdoor, setLikesOutdoor] = useState(false);
  const [likesBoardGames, setLikesBoardGames] = useState(false);
  const [likesSports, setLikesSports] = useState(false);
  // 乐
  const [likesKTV, setLikesKTV] = useState(false);
  const [likesMovie, setLikesMovie] = useState(false);
  const [likesScript, setLikesScript] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('userSettings').then(data => {
      if (data) {
        const settings = JSON.parse(data);
        setVegetarian(settings.vegetarian ?? false);
        setLikesSpicy(settings.likesSpicy ?? false);
        setPrefersNoodles(settings.prefersNoodles ?? false);
        setLikesMilkTea(settings.likesMilkTea ?? false);
        setLikesCoffee(settings.likesCoffee ?? false);
        setLowSugar(settings.lowSugar ?? false);
        setLikesOutdoor(settings.likesOutdoor ?? false);
        setLikesBoardGames(settings.likesBoardGames ?? false);
        setLikesSports(settings.likesSports ?? false);
        setLikesKTV(settings.likesKTV ?? false);
        setLikesMovie(settings.likesMovie ?? false);
        setLikesScript(settings.likesScript ?? false);
      }
    });
  }, []);

  const saveSettings = async () => {
    const settings = {
      vegetarian, likesSpicy, prefersNoodles,
      likesMilkTea, likesCoffee, lowSugar,
      likesOutdoor, likesBoardGames, likesSports,
      likesKTV, likesMovie, likesScript
    };
    await AsyncStorage.setItem('userSettings', JSON.stringify(settings));
    alert('保存成功！');
    navigation.goBack();
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>吃喝玩乐偏好设置</Text>
      <Text style={styles.sectionTitle}>吃</Text>
      <View style={styles.row}><Text>素食</Text><Switch value={vegetarian} onValueChange={setVegetarian} /></View>
      <View style={styles.row}><Text>喜欢辣</Text><Switch value={likesSpicy} onValueChange={setLikesSpicy} /></View>
      <View style={styles.row}><Text>偏爱面食</Text><Switch value={prefersNoodles} onValueChange={setPrefersNoodles} /></View>
      <Text style={styles.sectionTitle}>喝</Text>
      <View style={styles.row}><Text>喜欢奶茶</Text><Switch value={likesMilkTea} onValueChange={setLikesMilkTea} /></View>
      <View style={styles.row}><Text>喜欢咖啡</Text><Switch value={likesCoffee} onValueChange={setLikesCoffee} /></View>
      <View style={styles.row}><Text>低糖/无糖</Text><Switch value={lowSugar} onValueChange={setLowSugar} /></View>
      <Text style={styles.sectionTitle}>玩</Text>
      <View style={styles.row}><Text>喜欢户外</Text><Switch value={likesOutdoor} onValueChange={setLikesOutdoor} /></View>
      <View style={styles.row}><Text>喜欢桌游</Text><Switch value={likesBoardGames} onValueChange={setLikesBoardGames} /></View>
      <View style={styles.row}><Text>喜欢运动</Text><Switch value={likesSports} onValueChange={setLikesSports} /></View>
      <Text style={styles.sectionTitle}>乐</Text>
      <View style={styles.row}><Text>喜欢K歌</Text><Switch value={likesKTV} onValueChange={setLikesKTV} /></View>
      <View style={styles.row}><Text>喜欢电影</Text><Switch value={likesMovie} onValueChange={setLikesMovie} /></View>
      <View style={styles.row}><Text>喜欢剧本杀</Text><Switch value={likesScript} onValueChange={setLikesScript} /></View>
      <Button title="保存" onPress={saveSettings} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 20, marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
}); 