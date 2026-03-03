import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { Search, SlidersHorizontal } from 'lucide-react-native';
import ProductCard from '../ProductCard/ProductCard';

interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  rating?: number;
  reviewCount?: number;
  inStock: boolean;
  category?: string;
  description?: string;
}

interface SearchResultsProps {
  query: string;
  onQueryChange: (query: string) => void;
  results: Product[];
  loading: boolean;
}

export function SearchResults({ 
  query, 
  onQueryChange, 
  results, 
  loading
}: SearchResultsProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('relevance');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = [
    'all',
    'cotton',
    'silk',
    'denim',
    'linen',
    'wool',
    'synthetic'
  ];

  const sortOptions = [
    { value: 'relevance', label: 'Relevance' },
    { value: 'price-low', label: 'Price: Low to High' },
    { value: 'price-high', label: 'Price: High to Low' },
    { value: 'rating', label: 'Customer Rating' },
    { value: 'newest', label: 'Newest First' },
  ];

  const filteredAndSortedResults = React.useMemo(() => {
    let filtered = [...results];

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(product => 
        product.category?.toLowerCase().includes(selectedCategory)
      );
    }

    // Filter by price range
    if (priceRange.min) {
      filtered = filtered.filter(product => product.price >= parseFloat(priceRange.min));
    }
    if (priceRange.max) {
      filtered = filtered.filter(product => product.price <= parseFloat(priceRange.max));
    }

    // Sort results
    switch (sortBy) {
      case 'price-low':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        filtered.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'newest':
        // Assuming newer products have higher IDs
        filtered.sort((a, b) => b.id.localeCompare(a.id));
        break;
      default:
        // Keep original order for relevance
        break;
    }

    return filtered;
  }, [results, selectedCategory, priceRange, sortBy]);

  return (
    <View className="flex-1 bg-gray-50">
      {/* Search Header */}
      <View className="bg-white px-4 py-3 border-b border-gray-200">
        <View className="flex-row items-center bg-gray-100 rounded-xl px-4 py-3 mb-3">
          <Search size={20} color="#6b7280" />
          <TextInput
            value={query}
            onChangeText={onQueryChange}
            placeholder="Search for products..."
            className="flex-1 ml-3 text-gray-900"
          />
        </View>

        <View className="flex-row items-center justify-between">
          <Text className="text-sm text-gray-600">
            {loading ? 'Searching...' : `${filteredAndSortedResults.length} results found`}
          </Text>
          
          <TouchableOpacity
            onPress={() => setShowFilters(!showFilters)}
            className="flex-row items-center bg-gray-100 px-3 py-2 rounded-lg"
          >
            <SlidersHorizontal size={16} color="#374151" />
            <Text className="text-sm font-medium text-gray-700 ml-2">Filters</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Filters Panel */}
      {showFilters && (
        <View className="bg-white border-b border-gray-200 p-4">
          {/* Sort By */}
          <View className="mb-4">
            <Text className="text-sm font-bold text-gray-900 mb-2">Sort By</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-2">
                {sortOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    onPress={() => setSortBy(option.value)}
                    className={`px-4 py-2 rounded-xl border ${
                      sortBy === option.value
                        ? 'bg-gray-900 border-gray-900'
                        : 'bg-white border-gray-300'
                    }`}
                  >
                    <Text className={`text-sm font-medium ${
                      sortBy === option.value ? 'text-white' : 'text-gray-700'
                    }`}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Categories */}
          <View className="mb-4">
            <Text className="text-sm font-bold text-gray-900 mb-2">Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-2">
                {categories.map((category) => (
                  <TouchableOpacity
                    key={category}
                    onPress={() => setSelectedCategory(category)}
                    className={`px-4 py-2 rounded-xl border ${
                      selectedCategory === category
                        ? 'bg-gray-900 border-gray-900'
                        : 'bg-white border-gray-300'
                    }`}
                  >
                    <Text className={`text-sm font-medium capitalize ${
                      selectedCategory === category ? 'text-white' : 'text-gray-700'
                    }`}>
                      {category === 'all' ? 'All Categories' : category}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Price Range */}
          <View>
            <Text className="text-sm font-bold text-gray-900 mb-2">Price Range</Text>
            <View className="flex-row gap-3">
              <View className="flex-1">
                <TextInput
                  value={priceRange.min}
                  onChangeText={(text) => setPriceRange(prev => ({ ...prev, min: text }))}
                  placeholder="Min price"
                  keyboardType="numeric"
                  className="bg-gray-100 rounded-xl px-4 py-3 text-gray-900"
                />
              </View>
              <View className="flex-1">
                <TextInput
                  value={priceRange.max}
                  onChangeText={(text) => setPriceRange(prev => ({ ...prev, max: text }))}
                  placeholder="Max price"
                  keyboardType="numeric"
                  className="bg-gray-100 rounded-xl px-4 py-3 text-gray-900"
                />
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Results */}
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 8 }}>
        {loading ? (
          <View className="flex-1 items-center justify-center py-20">
            <Text className="text-gray-500">Searching products...</Text>
          </View>
        ) : filteredAndSortedResults.length === 0 ? (
          <View className="flex-1 items-center justify-center py-20">
            <Search size={48} color="#d1d5db" />
            <Text className="text-lg font-bold text-gray-900 mt-4 mb-2">No results found</Text>
            <Text className="text-gray-500 text-center">
              Try adjusting your search terms or filters
            </Text>
          </View>
        ) : (
          <View className="flex-row flex-wrap justify-between">
            {filteredAndSortedResults.map((product) => (
              <View key={product.id} className="w-[48%] mb-4">
                <ProductCard product={product} />
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}