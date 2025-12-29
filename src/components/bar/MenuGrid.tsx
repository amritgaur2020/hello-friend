import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Minus, Wine, Beer, Coffee, GlassWater, Martini, Search } from 'lucide-react';
import { BarMenuItem, BAR_CATEGORIES, CartItem } from '@/types/bar';
import { cn } from '@/lib/utils';
import { useHotelSettings } from '@/hooks/useHotelSettings';

interface MenuGridProps {
  menuItems: BarMenuItem[];
  onAddToCart: (item: BarMenuItem) => void;
  cart: CartItem[];
  onUpdateQuantity: (itemId: string, quantity: number) => void;
}

const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  cocktails: Martini,
  mocktails: GlassWater,
  whisky: Wine,
  beer: Beer,
  wine: Wine,
  soft_drinks: Coffee,
};

export function MenuGrid({ menuItems, onAddToCart, cart, onUpdateQuantity }: MenuGridProps) {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { settings } = useHotelSettings();

  const filteredItems = menuItems.filter(item => {
    const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch && item.is_available;
  });

  const getCartQuantity = (itemId: string) => {
    const cartItem = cart.find(c => c.id === itemId);
    return cartItem?.cartQuantity || 0;
  };

  const categories = ['all', ...BAR_CATEGORIES.map(c => c.value)];
  const usedCategories = categories.filter(cat => 
    cat === 'all' || menuItems.some(item => item.category === cat)
  );

  return (
    <div className="h-full flex flex-col">
      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search drinks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-card border-border"
        />
      </div>

      {/* Category Tabs */}
      <Tabs value={activeCategory} onValueChange={setActiveCategory} className="flex-1 flex flex-col">
        <TabsList className="w-full flex-wrap h-auto gap-1 bg-muted/50 p-1">
          {usedCategories.map((cat) => {
            const Icon = categoryIcons[cat] || Wine;
            const label = cat === 'all' ? 'All' : BAR_CATEGORIES.find(c => c.value === cat)?.label || cat;
            return (
              <TabsTrigger
                key={cat}
                value={cat}
                className="flex-1 min-w-[80px] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Icon className="h-3 w-3 mr-1" />
                <span className="text-xs">{label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value={activeCategory} className="flex-1 mt-4 overflow-y-auto">
          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
              <Wine className="h-12 w-12 mb-2 opacity-50" />
              <p>No items found</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredItems.map((item) => {
                const quantity = getCartQuantity(item.id);
                const Icon = categoryIcons[item.category] || Wine;
                
                return (
                  <Card
                    key={item.id}
                    className={cn(
                      'cursor-pointer transition-all hover:ring-2 hover:ring-primary/50 bg-card/50',
                      quantity > 0 && 'ring-2 ring-primary'
                    )}
                    onClick={() => quantity === 0 && onAddToCart(item)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        {quantity > 0 && (
                          <div className="flex items-center gap-1 bg-primary rounded-full">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 rounded-full hover:bg-primary-foreground/20"
                              onClick={(e) => {
                                e.stopPropagation();
                                onUpdateQuantity(item.id, quantity - 1);
                              }}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="text-sm font-bold px-1 text-primary-foreground">{quantity}</span>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 rounded-full hover:bg-primary-foreground/20"
                              onClick={(e) => {
                                e.stopPropagation();
                                onUpdateQuantity(item.id, quantity + 1);
                              }}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                      <h4 className="font-medium text-sm truncate">{item.name}</h4>
                      <p className="text-primary font-bold text-lg">
                        {settings?.currency_symbol || '₹'}{item.price.toFixed(2)}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
