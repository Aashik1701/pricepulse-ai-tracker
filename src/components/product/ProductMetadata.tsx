
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface ProductMetadataProps {
  metadata: {
    brand?: string;
    model?: string;
    category?: string;
    features?: string[];
    [key: string]: unknown;
  };
}

const ProductMetadata = ({ metadata }: ProductMetadataProps) => {
  // Filter out empty values and features array (which we'll display separately)
  const metadataEntries = Object.entries(metadata)
    .filter(([key, value]) => value !== undefined && value !== null && value !== '' && key !== 'features');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Product Specs</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-1/3">Attribute</TableHead>
                <TableHead>Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {metadataEntries.map(([key, value]) => (
                <TableRow key={key}>
                  <TableCell className="font-medium capitalize">{key}</TableCell>
                  <TableCell>{value}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {metadata.features && metadata.features.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Key Features</h3>
              <div className="flex flex-wrap gap-2">
                {metadata.features.map((feature, index) => (
                  <Badge key={index} variant="outline">{feature}</Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProductMetadata;
