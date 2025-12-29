import { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

interface RecentItemsListProps<T> {
  title: string;
  items: T[];
  emptyMessage: string;
  viewAllLink: string;
  renderItem: (item: T) => ReactNode;
  keyExtractor: (item: T) => string;
}

export function RecentItemsList<T>({ 
  title, 
  items, 
  emptyMessage, 
  viewAllLink, 
  renderItem,
  keyExtractor 
}: RecentItemsListProps<T>) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{title}</CardTitle>
        <Link to={viewAllLink}>
          <Button variant="outline" size="sm">View All</Button>
        </Link>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">{emptyMessage}</p>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={keyExtractor(item)} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                {renderItem(item)}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
