import { PrismaClient } from "@prisma/client";
import { seedAdmin } from "./seedAdmin"

async function seed(){
    const prisma = new PrismaClient();
    // Seed Function Call Goes Here
   seedAdmin(prisma)
}

seed().then(()=>{
    console.log("ALL SEEDING DONE")
})