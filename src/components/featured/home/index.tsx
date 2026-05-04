'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/shared/atoms/table';

const HomeFeatured = () => {
  return (
    <div>
      <h1>Home Featured</h1>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-body-lg-bold">Symbol</TableHead>
            <TableHead className="text-body-sm-bold">Name</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>1</TableCell>
            <TableCell>2</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
};

export default HomeFeatured;
