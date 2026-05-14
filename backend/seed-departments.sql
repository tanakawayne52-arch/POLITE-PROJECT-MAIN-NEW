-- Seed Departments and Units for MOHCC Zimbabwe
USE attendance_db;

-- Clear existing data before inserting new data
DELETE FROM units;
DELETE FROM directorates;

-- Insert Directorates (Main Departments) with explicit IDs
INSERT IGNORE INTO directorates (id, name, icon, color) VALUES
(1, 'Curative Services', 'stethoscope', 'blue'),
(2, 'Public Health', 'shield', 'green'),
(3, 'Policy, Planning, Monitoring and Evaluation', 'clipboard-list', 'purple'),
(4, 'Finance and Administration', 'banknote', 'amber'),
(5, 'Human Resources Management', 'users', 'rose'),
(6, 'Administration and Logistics', 'truck', 'cyan'),
(7, 'Legal Services', 'scale', 'slate'),
(8, 'Public Relations Unit', 'megaphone', 'orange');

-- Insert Units for Curative Services (directorate_id = 1)
INSERT IGNORE INTO units (name, directorate_id, staff_count) VALUES
('Pharmacy', 1, 0),
('Nursing', 1, 0),
('Oral Health', 1, 0),
('Pathology Services', 1, 0),
('Laboratory Services', 1, 0),
('Traditional Medicine', 1, 0),
('Rehabilitation Services', 1, 0),
('Mental Health Services', 1, 0);

-- Insert Units for Public Health (directorate_id = 2)
INSERT IGNORE INTO units (name, directorate_id, staff_count) VALUES
('HIV/AIDS & TB', 2, 0),
('Epidemiology and Disease Control', 2, 0),
('Malaria Control', 2, 0),
('Environmental Health Services', 2, 0),
('National Institute of Health Research', 2, 0),
('Government Analyst (Bio Analytics)', 2, 0),
('Family Health', 2, 0),
('Radiation Protection Unit', 2, 0),
('Non-Communicable Diseases', 2, 0);

-- Policy, Planning, Monitoring and Evaluation has no sub-units listed
-- No units to insert for this directorate

-- Insert Units for Finance and Administration (directorate_id = 4)
INSERT IGNORE INTO units (name, directorate_id, staff_count) VALUES
('Revenue', 4, 0),
('Expenditure', 4, 0),
('ICT Department', 4, 0);

-- Human Resources Management has no sub-units listed
-- No units to insert for this directorate

-- Insert Units for Administration and Logistics (directorate_id = 6)
INSERT IGNORE INTO units (name, directorate_id, staff_count) VALUES
('Administration and Logistics', 6, 0),
('Internal Audit', 6, 0),
('Procurement Services', 6, 0);

-- Legal Services has no sub-units listed
-- No units to insert for this directorate

-- Public Relations Unit has no sub-units listed
-- No units to insert for this directorate

-- Verify the data
SELECT d.id, d.name as directorate, d.icon, d.color, 
       COUNT(u.id) as unit_count
FROM directorates d
LEFT JOIN units u ON d.id = u.directorate_id
GROUP BY d.id, d.name, d.icon, d.color
ORDER BY d.id;
