import {test,expect} from '@playwright/test';
import sharp from 'sharp';
import {randomBytes} from 'node:crypto';
// Uses the same explicit isolated-staging target/auth guard as releases one and two.
// Creates one private working story through the UI; no publication or source activation.
test('release three current writing, actual mobile preview, tags and approved cover upload',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/studio/posts');
 await page.getByRole('button',{name:'New story',exact:true}).click();
 const title=`Isolated release three ${Date.now()}`;
 await page.getByLabel('Title',{exact:true}).fill(title);
 await page.getByLabel('Hook',{exact:true}).fill('Retained current writing');
 await page.getByRole('combobox',{name:'Niche',exact:true}).selectOption('books');
 await page.getByRole('textbox',{name:'Add tag',exact:true}).fill('browser-verification');
 await page.getByRole('textbox',{name:'Add tag',exact:true}).press('Enter');
 await expect(page.getByRole('button',{name:'Remove tag browser-verification'})).toBeVisible();
 await expect(page.getByRole('status')).toHaveText('Saved',{timeout:15000});
 await page.getByRole('button',{name:'Preview public story',exact:true}).click();
 await page.getByRole('button',{name:'Mobile',exact:true}).click();
 const preview=page.frameLocator('iframe[title="Public story preview"]');
 await expect(preview.getByRole('heading',{name:title,exact:true})).toBeVisible();
 await expect(preview.getByText('Retained current writing',{exact:true})).toBeVisible();
 await page.getByLabel('Hook',{exact:true}).fill('Current preview before save');
 await expect(preview.getByText('Current preview before save',{exact:true})).toBeVisible();
 expect(await page.locator('iframe').evaluate((frame:HTMLIFrameElement)=>frame.contentWindow!.innerWidth)).toBe(390);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 const upload=page.getByRole('form',{name:'Upload approved image'});
 const png=await sharp(randomBytes(900*900*3),{raw:{width:900,height:900,channels:3}}).png().toBuffer();
 expect(png.length).toBeGreaterThan(1_000_000); // Exercises the raised server-action transport limit, separate from the 10MB validator.
 await upload.getByLabel('Image file (JPEG, PNG or WebP, up to 10 MB)').setInputFiles({name:'permission-cover.png',mimeType:'image/png',buffer:png});
 await upload.getByLabel('Alt text').fill('Isolated approved test cover');
 await upload.getByLabel('Original source URL').fill('https://example.com/permission');
 await upload.getByLabel('Credit line').fill('Isolated rights test');
 await upload.getByLabel('Licence or permission record').fill('Test owner permission');
 await upload.getByRole('checkbox',{name:'Commercial display is permitted'}).check();
 await upload.getByRole('checkbox',{name:'Resizing, cropping and lossy conversion are permitted'}).check();
 await upload.getByRole('button',{name:'Upload image',exact:true}).click();
 await expect(page.getByRole('status')).toHaveText('Saved',{timeout:15000});
 await expect(page.getByLabel('Hook',{exact:true})).toHaveValue('Current preview before save');
 await expect(preview.getByRole('img',{name:'Isolated approved test cover',exact:true})).toBeVisible();
 await page.reload();
 await expect(page.getByLabel('Hook',{exact:true})).toHaveValue('Current preview before save');
 await expect(page.getByRole('combobox',{name:'Story image'})).not.toHaveValue('');
 // Retain the isolated private record for controller inspection and reversible cleanup.
});
