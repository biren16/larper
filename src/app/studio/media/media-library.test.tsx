import {fireEvent,render,screen} from '@testing-library/react';
import {expect,it} from 'vitest';
import {MediaLibrary} from './media-library';
it('searches attributable thumbnail media and keeps a generated cover option',()=>{
 render(<MediaLibrary assets={[{id:'a',src:'https://example.com/a.webp',alt:'Race car',creditLine:'Artist',sourceUrl:'https://example.com/press',licenseCode:'CC BY',modificationAllowed:false},{id:'b',src:'https://example.com/b.webp',alt:'Concert',creditLine:'Band',sourceUrl:'https://example.com/b',licenseCode:'permission',modificationAllowed:true}]} />);
 expect(screen.getByRole('img',{name:'Race car'})).toBeInTheDocument();
 fireEvent.change(screen.getByRole('searchbox',{name:'Search media'}),{target:{value:'Artist'}});
 expect(screen.queryByRole('img',{name:'Concert'})).not.toBeInTheDocument();
 expect(screen.getByText('CC BY')).toBeInTheDocument();
 expect(screen.getByText(/LARPer cover/)).toBeInTheDocument();
});
