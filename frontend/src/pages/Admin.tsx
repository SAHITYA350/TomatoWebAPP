import React, { useState } from 'react'
import { adminService } from '../config';
import axios from 'axios';

const Admin = () => {

    const [restaurant, setRestaurant] = useState<any[]>([]);
    const [riders, setRiders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<"restaurant" | "rider">("restaurant");

    const fetchData = async () => {
        try {
            const { data } = await axios.get(`${adminService}/api/v1/admin/restaurant/pending`, 

            );
        } catch (error) {
            console.log(error);
        }
    }
  return (
    <div>
      Admin
    </div>
  )
}

export default Admin
