import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styled from '@emotion/styled';
import { 
  Typography, 
  Box, 
  Paper, 
  IconButton, 
  TextField, 
  InputAdornment, 
  Grid, 
  CircularProgress, 
  Checkbox, 
  Button, 
  Badge,
  Chip,
  Drawer,
  Divider,
  InputBase,
  useMediaQuery
} from '@mui/material';
import { 
  Search as SearchIcon, 
  Clear as ClearIcon, 
  Star as StarIcon, 
  ShoppingCart as CartIcon,
  FavoriteBorder as HeartOutlineIcon,
  Favorite as HeartIcon,
  TuneOutlined as FilterIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Close as CloseIcon,
  Check as CheckIcon
} from '@mui/icons-material';
import pb from '../pocketbase';

const SearchResultsScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialQuery = queryParams.get('query') || '';
  
  const isTablet = useMediaQuery('(min-width:768px)');
  const isDesktop = useMediaQuery('(min-width:1200px)');
  const isLargeDesktop = useMediaQuery('(min-width:1600px)');
  
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [categories, setCategories] = useState([]);
  const [firstLoad, setFirstLoad] = useState(true);
  
  // Calculate number of columns based on screen size
  const getNumColumns = () => {
    if (isLargeDesktop) return 5;
    if (isDesktop) return 4;
    if (isTablet) return 3;
    return 2;
  };
  
  const numColumns = getNumColumns();
  
  // Filter states
  const [filters, setFilters] = useState({
    minPrice: '',
    maxPrice: '',
    category: '',
    minRating: '',
    inStock: false,
    featured: false,
    onSale: false,
    sort: 'newest'
  });
  
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);
  
  // Load categories for filter
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const categoryRecords = await pb.collection('categories').getList(1, 50, {
          sort: 'name'
        });
        setCategories(categoryRecords.items);
      } catch (error) {
        console.error('Error fetching categories:', error);
        setCategories([]);
      }
    };
    
    fetchCategories();
  }, []);
  
  // Update active filters count
  useEffect(() => {
    let count = 0;
    if (filters.minPrice) count++;
    if (filters.maxPrice) count++;
    if (filters.category) count++;
    if (filters.minRating) count++;
    if (filters.inStock) count++;
    if (filters.featured) count++;
    if (filters.onSale) count++;
    if (filters.sort !== 'newest') count++;
    
    setActiveFiltersCount(count);
  }, [filters]);
  
  // Handle search query from URL
  useEffect(() => {
    if (initialQuery !== searchQuery && firstLoad) {
      setFirstLoad(false);
      setSearchQuery(initialQuery);
    }
  }, [initialQuery, searchQuery, firstLoad]);
  
  // Search products with filters
  const searchProducts = async (query, filters = {}, page = 1, perPage = 10) => {
    try {
      console.log('Searching products with query:', query, 'filters:', filters);

      // Build filter string
      let filterString = query ? `(title ~ "${query}" || description ~ "${query}") && status='published'` : 'status="published"';

      // Apply price range filter
      if (filters.minPrice && filters.maxPrice) {
        const priceFilter = `price >= ${filters.minPrice} && price <= ${filters.maxPrice}`;
        filterString = filterString ? `(${filterString}) && (${priceFilter})` : priceFilter;
      } else if (filters.minPrice) {
        const priceFilter = `price >= ${filters.minPrice}`;
        filterString = filterString ? `(${filterString}) && (${priceFilter})` : priceFilter;
      } else if (filters.maxPrice) {
        const priceFilter = `price <= ${filters.maxPrice}`;
        filterString = filterString ? `(${filterString}) && (${priceFilter})` : priceFilter;
      }

      // Apply category filter
      if (filters.category) {
        const categoryFilter = `category ?~ "${filters.category}"`;
        filterString = filterString ? `(${filterString}) && (${categoryFilter})` : categoryFilter;
      }

      // Apply rating filter
      if (filters.minRating) {
        const ratingFilter = `rating >= ${filters.minRating}`;
        filterString = filterString ? `(${filterString}) && (${ratingFilter})` : ratingFilter;
      }

      // Apply stock filter
      if (filters.inStock) {
        const stockFilter = `stock > 0`;
        filterString = filterString ? `(${filterString}) && (${stockFilter})` : stockFilter;
      }

      // Apply featured filter
      if (filters.featured) {
        const featuredFilter = `featured = true`;
        filterString = filterString ? `(${filterString}) && (${featuredFilter})` : featuredFilter;
      }

      // Apply discount filter
      if (filters.onSale) {
        const discountFilter = `discount > 0`;
        filterString = filterString ? `(${filterString}) && (${discountFilter})` : discountFilter;
      }

      // Set sort parameter
      let sortParam = '-created';
      switch (filters.sort) {
        case 'price_asc':
          sortParam = 'price';
          break;
        case 'price_desc':
          sortParam = '-price';
          break;
        case 'rating':
          sortParam = '-rating';
          break;
        case 'newest':
        default:
          sortParam = '-created';
      }

      // Fetch products with expanded seller data
      const productRecords = await pb.collection('products').getList(page, perPage, {
        filter: filterString,
        sort: sortParam,
        expand: 'seller',
      });

      // Filter products using expanded seller data
      const productsFiltered = productRecords.items.filter(product => {
        return product.expand?.seller?.admin_verified === true;
      });

      return {
        items: productsFiltered,
        totalItems: productRecords.totalItems,
        totalPages: productRecords.totalPages,
      };
    } catch (error) {
      console.error('Error searching products:', error);
      throw error;
    }
  };
  
  const handleSearch = useCallback(async (pageNum = 1, refresh = false) => {
    try {
      setError(null);
      if (pageNum === 1) {
        setIsLoading(true);
      } else {
        setLoadingMore(true);
      }
      
      const perPage = 10;
      const result = await searchProducts(searchQuery, filters, pageNum, perPage);
      
      if (refresh || pageNum === 1) {
        setProducts(result.items);
      } else {
        setProducts(prev => [...prev, ...result.items]);
      }
      
      setHasMore(pageNum < result.totalPages);
      setPage(pageNum);
    } catch (err) {
      setError('Failed to search products. Please try again.');
      console.error('Error searching products:', err);
    } finally {
      setIsLoading(false);
      setLoadingMore(false);
      setIsRefreshing(false);
    }
  }, [searchQuery, filters]);
  
  // Initial search when component mounts
  useEffect(() => {
    handleSearch(1, true);
  }, []);
  
  const handleRefresh = () => {
    setIsRefreshing(true);
    handleSearch(1, true);
  };
  
  const loadMoreProducts = () => {
    if (!loadingMore && hasMore) {
      handleSearch(page + 1);
    }
  };
  
  const toggleFavorite = (productId) => {
    console.log('Toggle favorite for product:', productId);
    // Implement wishlist functionality
  };
  
  const addToCart = (product) => {
    console.log('Add to cart:', product.id);
    // Implement cart functionality
  };
  
  const applyFilters = () => {
    setShowFilters(false);
    setPage(1);
    handleSearch(1, true);
  };
  
  const resetFilters = () => {
    setFilters({
      minPrice: '',
      maxPrice: '',
      category: '',
      minRating: '',
      inStock: false,
      featured: false,
      onSale: false,
      sort: 'newest'
    });
    setPage(1);
    handleSearch(1, true);
  };
  
  // Handle scroll for infinite loading
  const handleScroll = useCallback(() => {
    if (window.innerHeight + document.documentElement.scrollTop >= document.documentElement.scrollHeight - 200) {
      if (!loadingMore && hasMore) {
        loadMoreProducts();
      }
    }
  }, [loadingMore, hasMore]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);
  
  // Recent searches - mock implementation
  const recentSearches = ['shirt', 'headphones', 'laptop', 'watch'];
  
  return (
    <PageContainer>
      <Header>
        <SearchInputContainer>
          <StyledInputBase
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch(1, true)}
            startAdornment={
              <InputAdornment position="start">
                <SearchIcon sx={{ color: '#999' }} />
              </InputAdornment>
            }
            endAdornment={
              searchQuery ? (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={() => {
                      setSearchQuery('');
                      setProducts([]);
                      handleSearch(1, true);
                    }}
                  >
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : null
            }
          />
          <FilterButton 
            color={activeFiltersCount > 0 ? "primary" : "default"}
            onClick={() => setShowFilters(true)}
          >
            <Badge badgeContent={activeFiltersCount} color="error">
              <FilterIcon />
            </Badge>
          </FilterButton>
        </SearchInputContainer>
      </Header>

      <MainContent>
        {isLoading ? (
          <SkeletonGrid>
            {Array(8).fill(0).map((_, index) => (
              <ProductSkeleton key={index} />
            ))}
          </SkeletonGrid>
        ) : products.length === 0 ? (
          <EmptyState>
            {searchQuery.trim() || activeFiltersCount > 0 ? (
              <>
                <SearchIcon sx={{ fontSize: 60, color: '#ccc', mb: 2 }} />
                <Typography variant="h5" fontWeight="bold" gutterBottom>No products found</Typography>
                <Typography variant="body1" color="textSecondary" sx={{ mb: 3, textAlign: 'center' }}>
                  We couldn't find any products matching your search criteria.
                </Typography>
                <Button variant="contained" onClick={resetFilters}>
                  Reset Filters
                </Button>
              </>
            ) : (
              <>
                <SearchIcon sx={{ fontSize: 60, color: '#ccc', mb: 2 }} />
                <Typography variant="h5" fontWeight="bold" gutterBottom>Search Products</Typography>
                <Typography variant="body1" color="textSecondary" sx={{ mb: 3, textAlign: 'center' }}>
                  Enter a search term to find products
                </Typography>
                <Box sx={{ width: '100%', mt: 4 }}>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>Recent Searches</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {recentSearches.map((search, index) => (
                      <Chip
                        key={index}
                        label={search}
                        onClick={() => {
                          setSearchQuery(search);
                          handleSearch(1, true);
                        }}
                        clickable
                        sx={{ 
                          bgcolor: '#e9ecef', 
                          color: '#495057',
                          '&:hover': { bgcolor: '#dee2e6' }
                        }}
                      />
                    ))}
                  </Box>
                </Box>
              </>
            )}
          </EmptyState>
        ) : (
          <ProductsGrid container spacing={2}>
            {products.map((product) => (
              <ProductGridItem item xs={6} sm={4} md={3} lg={numColumns === 5 ? 2.4 : 3} key={product.id}>
                <ProductCard
                  onClick={() => navigate(`/product/${product.slug}`, { state: { product } })}
                >
                  <ProductImageContainer>
                    <ProductImage 
                      src={product.images && product.images.length > 0 
                        ? pb.files.getURL(product, product.images[0]) 
                        : 'https://via.placeholder.com/300'
                      }
                      alt={product.title}
                    />
                    {product.discount > 0 && (
                      <SaleBadge>
                        <Typography variant="caption" fontWeight="bold">
                          {product.discount}% OFF
                        </Typography>
                      </SaleBadge>
                    )}
                    {product.featured && (
                      <FeaturedBadge>
                        <Typography variant="caption" fontWeight="bold">
                          Featured
                        </Typography>
                      </FeaturedBadge>
                    )}
                    {product.stock <= 5 && product.stock > 0 ? (
                      <StockBadge color="warning">
                        <Typography variant="caption" fontWeight="bold">
                          Only {product.stock} left
                        </Typography>
                      </StockBadge>
                    ) : product.stock === 0 ? (
                      <StockBadge color="error">
                        <Typography variant="caption" fontWeight="bold">
                          Out of stock
                        </Typography>
                      </StockBadge>
                    ) : null}
                    {product.delivery_charge === 0 && product.stock !== 0 && (
                      <DeliveryBadge>
                        <Typography variant="caption" fontWeight="bold">
                          Free Delivery
                        </Typography>
                      </DeliveryBadge>
                    )}
                  </ProductImageContainer>
                  
                  <ProductInfo>
                    <ProductTitle>
                      {product.title}
                    </ProductTitle>
                    
                    <RatingContainer>
                      <StarIcon sx={{ color: '#FFD700', fontSize: 16 }} />
                      <Typography variant="body2" color="text.secondary">
                        {product.rating ? product.rating.toFixed(1) : (Math.random() * 2 + 3).toFixed(1)}
                        <Typography component="span" variant="caption" color="text.disabled" sx={{ ml: 0.5 }}>
                          ({product.reviews_count || Math.floor(Math.random() * 100) + 10})
                        </Typography>
                      </Typography>
                    </RatingContainer>
                    
                    <PriceContainer>
                      {product.discount > 0 ? (
                        <>
                          <Typography variant="body1" fontWeight="bold">
                            ৳{parseFloat(product.price * (1 - product.discount / 100)).toFixed(2)}
                          </Typography>
                          <Typography variant="body2" color="text.disabled" sx={{ textDecoration: 'line-through', ml: 1 }}>
                            ৳{parseFloat(product.price).toFixed(2)}
                          </Typography>
                        </>
                      ) : (
                        <Typography variant="body1" fontWeight="bold">
                          ৳{parseFloat(product.price).toFixed(2)}
                        </Typography>
                      )}
                    </PriceContainer>
                  </ProductInfo>
                </ProductCard>
              </ProductGridItem>
            ))}
          </ProductsGrid>
        )}
        
        {loadingMore && (
          <LoadingMore>
            <CircularProgress size={24} />
            <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
              Loading more products...
            </Typography>
          </LoadingMore>
        )}
      </MainContent>

      {/* Filters Drawer */}
      <FilterDrawer
        anchor="right"
        open={showFilters}
        onClose={() => setShowFilters(false)}
      >
        <FilterHeader>
          <Typography variant="h6" fontWeight="bold">Filters</Typography>
          <IconButton onClick={() => setShowFilters(false)}>
            <CloseIcon />
          </IconButton>
        </FilterHeader>
        
        <FilterContent>
          {/* Price Range */}
          <FilterSection>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Price Range
            </Typography>
            <PriceInputContainer>
              <PriceInput
                placeholder="Min"
                variant="outlined"
                type="number"
                value={filters.minPrice}
                onChange={(e) => setFilters(prev => ({ ...prev, minPrice: e.target.value }))}
                size="small"
              />
              <Typography variant="body1" sx={{ mx: 1 }}>-</Typography>
              <PriceInput
                placeholder="Max"
                variant="outlined"
                type="number"
                value={filters.maxPrice}
                onChange={(e) => setFilters(prev => ({ ...prev, maxPrice: e.target.value }))}
                size="small"
              />
            </PriceInputContainer>
          </FilterSection>
          
          <Divider />
          
          {/* Category */}
          <FilterSection>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Category
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {categories.map((category) => (
                <Chip
                  key={category.id}
                  label={category.name}
                  onClick={() => setFilters(prev => ({
                    ...prev,
                    category: prev.category === category.id ? '' : category.id
                  }))}
                  color={filters.category === category.id ? "primary" : "default"}
                  variant={filters.category === category.id ? "filled" : "outlined"}
                  clickable
                />
              ))}
            </Box>
          </FilterSection>
          
          <Divider />
          
          {/* Rating */}
          <FilterSection>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Minimum Rating
            </Typography>
            <RatingButtonsContainer>
              {[1, 2, 3, 4, 5].map((rating) => (
                <RatingButton
                  key={`rating-${rating}`}
                  variant={filters.minRating === rating.toString() ? "contained" : "outlined"}
                  onClick={() => setFilters(prev => ({
                    ...prev,
                    minRating: prev.minRating === rating.toString() ? '' : rating.toString()
                  }))}
                >
                  {rating}+ ⭐
                </RatingButton>
              ))}
            </RatingButtonsContainer>
          </FilterSection>
          
          <Divider />
          
          {/* Additional Filters */}
          <FilterSection>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Additional Filters
            </Typography>
            <Box>
              <CheckboxItem>
                <CustomCheckbox
                  checked={filters.inStock}
                  onChange={() => setFilters(prev => ({ ...prev, inStock: !prev.inStock }))}
                  icon={<CheckboxIcon />}
                  checkedIcon={<CheckboxIconChecked />}
                />
                <Typography variant="body1">In Stock Only</Typography>
              </CheckboxItem>
              
              <CheckboxItem>
                <CustomCheckbox
                  checked={filters.featured}
                  onChange={() => setFilters(prev => ({ ...prev, featured: !prev.featured }))}
                  icon={<CheckboxIcon />}
                  checkedIcon={<CheckboxIconChecked />}
                />
                <Typography variant="body1">Featured Items</Typography>
              </CheckboxItem>
              
              <CheckboxItem>
                <CustomCheckbox
                  checked={filters.onSale}
                  onChange={() => setFilters(prev => ({ ...prev, onSale: !prev.onSale }))}
                  icon={<CheckboxIcon />}
                  checkedIcon={<CheckboxIconChecked />}
                />
                <Typography variant="body1">On Sale</Typography>
              </CheckboxItem>
            </Box>
          </FilterSection>
          
          <Divider />
          
          {/* Sort By */}
          <FilterSection>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Sort By
            </Typography>
            <SortContainer>
              {[
                { value: 'newest', label: 'Newest' },
                { value: 'price_asc', label: 'Price: Low to High' },
                { value: 'price_desc', label: 'Price: High to Low' },
                { value: 'rating', label: 'Top Rated' }
              ].map((option) => (
                <SortButton
                  key={option.value}
                  variant={filters.sort === option.value ? "contained" : "outlined"}
                  onClick={() => setFilters(prev => ({ ...prev, sort: option.value }))}
                  fullWidth
                >
                  {option.label}
                </SortButton>
              ))}
            </SortContainer>
          </FilterSection>
        </FilterContent>
        
        <FilterActions>
          <Button 
            variant="outlined" 
            onClick={resetFilters}
            sx={{ flex: 1, mr: 1 }}
          >
            Reset
          </Button>
          <Button 
            variant="contained" 
            onClick={applyFilters}
            sx={{ flex: 2 }}
          >
            Apply Filters
          </Button>
        </FilterActions>
      </FilterDrawer>
    </PageContainer>
  );
};

// Product Skeleton
const ProductSkeleton = () => (
  <SkeletonCard>
    <SkeletonImage />
    <Box sx={{ p: 1.5 }}>
      <SkeletonTitle />
      <SkeletonRating />
      <SkeletonPrice />
    </Box>
  </SkeletonCard>
);

// Styled Components
const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: #f8f9fa;
`;

const Header = styled.header`
  padding: 12px 16px;
  background-color: #fff;
  border-bottom: 1px solid #eee;
  position: sticky;
  top: 0;
  z-index: 10;
`;

const SearchInputContainer = styled.div`
  display: flex;
  align-items: center;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
`;

const StyledInputBase = styled(InputBase)`
  flex: 1;
  background-color: #f0f0f0;
  border-radius: 10px;
  padding: 8px 12px;
  height: 44px;
  font-size: 16px;
`;

const FilterButton = styled(IconButton)`
  margin-left: 12px;
  background-color: ${props => props.color === "primary" ? "#007bff" : "#f0f0f0"};
  color: ${props => props.color === "primary" ? "#fff" : "#333"};
  width: 44px;
  height: 44px;
  
  &:hover {
    background-color: ${props => props.color === "primary" ? "#0069d9" : "#e0e0e0"};
  }
`;

const MainContent = styled.main`
  flex: 1;
  padding: 16px;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
  min-height: 50vh;
`;

const ProductsGrid = styled(Grid)`
  padding-bottom: 24px;
`;

const ProductGridItem = styled(Grid)`
  display: flex;
`;

const ProductCard = styled(Paper)`
  width: 100%;
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  height: 100%;
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
  }
`;

const ProductImageContainer = styled.div`
  position: relative;
  padding-top: 100%; /* 1:1 Aspect Ratio */
  background-color: #f0f0f0;
`;

const ProductImage = styled.img`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const SaleBadge = styled.div`
  position: absolute;
  top: 8px;
  left: 8px;
  background-color: #ff3b30;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  z-index: 1;
`;

const FeaturedBadge = styled.div`
  position: absolute;
  top: 8px;
  right: 8px;
  background-color: #007bff;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  z-index: 1;
`;

const StockBadge = styled.div`
  position: absolute;
  bottom: 8px;
  left: 8px;
  background-color: ${props => props.color === "error" ? "#f30" : "#f90"};
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  z-index: 1;
`;

const DeliveryBadge = styled.div`
  position: absolute;
  bottom: 8px;
  right: 8px;
  background-color: #28a745;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  z-index: 1;
`;

const ProductInfo = styled.div`
  padding: 12px;
  flex-grow: 1;
  display: flex;
  flex-direction: column;
`;

const ProductTitle = styled(Typography)`
  font-weight: 600;
  font-size: 14px;
  line-height: 1.4;
  color: #333;
  margin-bottom: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
`;

const RatingContainer = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 6px;
`;

const PriceContainer = styled.div`
  display: flex;
  align-items: center;
  margin-top: auto;
`;

const LoadingMore = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px 0;
`;

const FilterDrawer = styled(Drawer)`
  .MuiDrawer-paper {
    width: 340px;
    max-width: 80vw;
  }
`;

const FilterHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #eee;
`;

const FilterContent = styled.div`
  flex: 1;
  overflow-y: auto;
`;

const FilterSection = styled.div`
  padding: 16px;
`;

const PriceInputContainer = styled.div`
  display: flex;
  align-items: center;
`;

const PriceInput = styled(TextField)`
  flex: 1;
`;

const RatingButtonsContainer = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 8px;
`;

const RatingButton = styled(Button)`
  flex: 1;
`;

const CheckboxItem = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 12px;
`;

const CustomCheckbox = styled(Checkbox)`
  padding: 6px;
  margin-right: 8px;
`;

const CheckboxIcon = styled.span`
  width: 24px;
  height: 24px;
  border-radius: 6px;
  border: 2px solid #ccc;
  display: inline-block;
`;

const CheckboxIconChecked = styled.span`
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background-color: #007bff;
  border: 2px solid #007bff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: white;
  
  &::after {
    content: '';
    width: 14px;
    height: 14px;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='white'%3E%3Cpath d='M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z'/%3E%3C/svg%3E");
    background-position: center;
    background-repeat: no-repeat;
  }
`;

const SortContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const SortButton = styled(Button)`
  text-align: left;
  justify-content: flex-start;
  padding: 12px 16px;
`;

const FilterActions = styled.div`
  display: flex;
  padding: 16px;
  border-top: 1px solid #eee;
`;

// Skeleton Styles
const SkeletonGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 16px;
  
  @media (min-width: 600px) {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  }
  
  @media (min-width: 960px) {
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  }
`;

const SkeletonCard = styled(Paper)`
  width: 100%;
  border-radius: 12px;
  overflow: hidden;
`;

const SkeletonImage = styled.div`
  width: 100%;
  padding-top: 100%;
  background-color: #e0e0e0;
`;

const SkeletonTitle = styled.div`
  height: 16px;
  background-color: #e0e0e0;
  margin-bottom: 8px;
  width: 80%;
  border-radius: 4px;
`;

const SkeletonRating = styled.div`
  height: 12px;
  background-color: #e0e0e0;
  margin-bottom: 8px;
  width: 40%;
  border-radius: 4px;
`;

const SkeletonPrice = styled.div`
  height: 16px;
  background-color: #e0e0e0;
  width: 30%;
  border-radius: 4px;
`;

export default SearchResultsScreen;