import {render,screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {expect,it,vi} from "vitest";
import {PostsManager} from "./posts-manager";
vi.mock("next/navigation",()=>({useRouter:()=>({refresh:vi.fn()})}));
vi.mock("./management-actions",()=>({managePostsAction:async()=>[{id:"one",ok:true,revision:4,candidateId:"one"},{id:"two",ok:false,conflict:true,error:"EDITORIAL_CONFLICT: Reload"}]}));
it("renders working metadata, confirmed controls and per-record bulk outcomes",async()=>{
 render(<PostsManager posts={[{id:"one",title:"Edited title",nicheId:"books",status:"published",lastEditedAt:"2026-10-01",editorialVersion:3,privateEdits:true,needsReview:"Add fresh evidence"},{id:"two",title:"Other title",nicheId:null,status:"draft",lastEditedAt:"2026-10-02",editorialVersion:2}]} niches={[{id:"books",name:"Books"}]} returnTo="/studio/posts?tab=published&page=2"/>);
 expect(screen.getByRole("link",{name:"Edited title"})).toHaveAttribute("href","/studio/candidates/one?returnTo=%2Fstudio%2Fposts%3Ftab%3Dpublished%26page%3D2");
 expect(screen.getByText(/Private edits/)).toBeInTheDocument();
 expect(screen.getByText(/Needs review: Add fresh evidence/)).toBeInTheDocument();
 const user=userEvent.setup();
 await user.click(screen.getByRole("checkbox",{name:"Select Edited title"}));
 await user.click(screen.getByRole("checkbox",{name:"Select Other title"}));
 await user.click(screen.getByRole("checkbox",{name:/Confirm the selected operation/}));
 await user.click(screen.getByRole("button",{name:"Apply to selection"}));
 expect(await screen.findByText(/Edited title: Saved revision 4/)).toBeInTheDocument();
 expect(screen.getByText(/Other title: Conflict/)).toBeInTheDocument();
});
