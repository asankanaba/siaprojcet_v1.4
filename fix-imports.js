const fs = require('fs');
const path = require('path');

// Directory containing your views
const viewsDir = path.join(__dirname, 'src', 'views');

// List of files to fix
const filesToFix = [
  'HRReports.vue',
  'HRAddPost.vue',
  'HRJobPosts.vue',
  'HRAttendance.vue',
  'HRArchivedEmployees.vue',
  'HREmployees.vue',
  'HRDashboard.vue'
];

console.log('🔧 Fixing HR imports...');

filesToFix.forEach(filename => {
  const filePath = path.join(viewsDir, filename);
  
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace the broken Sidebar import with the working @ alias
    const brokenImport = "import Sidebar from '@/components/common/Sidebar.vue'";
    const fixedImport = "import Sidebar from '@/components/common/Sidebar.vue'";
    
    // Also fix Navbar just in case
    const brokenNavbar = "import Navbar from '@/components/common/Navbar.vue'";
    const fixedNavbar = "import Navbar from '@/components/common/Navbar.vue'";
    
    if (content.includes(brokenImport)) {
      content = content.replace(brokenImport, fixedImport);
      console.log(`✅ Fixed Sidebar import in ${filename}`);
    }
    
    if (content.includes(brokenNavbar)) {
      content = content.replace(brokenNavbar, fixedNavbar);
      console.log(`✅ Fixed Navbar import in ${filename}`);
    }
    
    fs.writeFileSync(filePath, content, 'utf8');
  } else {
    console.log(`❌ File not found: ${filename}`);
  }
});

console.log('🎉 All HR files fixed!');